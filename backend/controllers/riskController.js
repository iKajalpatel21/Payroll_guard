const Employee = require('../models/Employee');
const RiskEvent = require('../models/RiskEvent');
const ChangeRequest = require('../models/ChangeRequest');
const { calculateRiskScore, getVerificationPath } = require('../services/riskScorer');
const { sendOtp } = require('../services/otpService');
const { explainRisk } = require('../services/geminiService');
const { autoAlert } = require('../services/alertService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── POST /api/risk-check ─────────────────────────────────────────────────────
exports.riskCheck = asyncHandler(async (req, res) => {
  const { deviceId, newBankDetails } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  const resolvedDeviceId = deviceId || req.headers['x-device-id'] || 'UNKNOWN';

  if (!newBankDetails?.accountNumber || !newBankDetails?.routingNumber) {
    return res.status(400).json({ success: false, message: 'newBankDetails (accountNumber, routingNumber) are required.' });
  }

  const employee = await Employee.findById(req.user.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

  // Block frozen accounts from making changes
  if (employee.isFrozen) {
    return res.status(403).json({ success: false, message: `Your account is frozen. Reason: ${employee.frozenReason || 'Contact security staff.'}` });
  }

  // ----- Score the risk -----
  const { score, riskCodes } = await calculateRiskScore(employee, ip, resolvedDeviceId);
  const path = getVerificationPath(score);

  // ----- Get AI explanation -----
  const aiExplanation = await explainRisk(riskCodes, score);

  // ----- Log the risk event -----
  const riskEvent = await RiskEvent.create({
    employeeId: employee._id,
    ip,
    deviceId: resolvedDeviceId,
    action: 'DEPOSIT_CHANGE_ATTEMPT',
    riskScore: score,
    riskCodes,
    aiExplanation,
  });

  // ----- Auto-alert security staff for high risk -----
  await autoAlert(employee._id, employee.name, score, riskCodes);


  if (path === 'AUTO_APPROVE') {
    // Update employee bank details directly
    employee.bankAccount = newBankDetails;
    // Add to trusted IP/device
    if (!employee.knownIPs.includes(ip)) employee.knownIPs.push(ip);
    if (!employee.knownDeviceIds.includes(resolvedDeviceId)) employee.knownDeviceIds.push(resolvedDeviceId);
    await employee.save();

    return res.json({
      success: true,
      path,
      riskScore: score,
      aiExplanation,
      message: 'Your payroll details have been updated successfully.',
    });
  }

  if (path === 'OTP_REQUIRED') {
    // Create ChangeRequest with PENDING_OTP
    const changeRequest = new ChangeRequest({
      employeeId: employee._id,
      newBankDetails,
      status: 'PENDING_OTP',
      riskScore: score,
      riskEventId: riskEvent._id,
    });

    const plainOtp = await sendOtp(employee.email, employee.name);
    await changeRequest.setOtp(plainOtp);
    await changeRequest.save();

    return res.status(202).json({
      success: true,
      path,
      riskScore: score,
      aiExplanation,
      changeRequestId: changeRequest._id,
      message: 'A verification code has been sent to your email.',
    });
  }

  // MANAGER_REQUIRED
  const changeRequest = await ChangeRequest.create({
    employeeId: employee._id,
    newBankDetails,
    status: 'PENDING_MANAGER',
    riskScore: score,
    riskEventId: riskEvent._id,
  });

  return res.status(202).json({
    success: true,
    path,
    riskScore: score,
    aiExplanation,
    changeRequestId: changeRequest._id,
    message: 'Your request has been flagged and sent to your manager for review.',
  });
});

// ─── POST /api/risk-check/verify-otp ─────────────────────────────────────────
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { changeRequestId, otp } = req.body;
  if (!changeRequestId || !otp) {
    return res.status(400).json({ success: false, message: 'changeRequestId and otp are required.' });
  }

  const changeRequest = await ChangeRequest.findById(changeRequestId).select('+otpHash +otpExpiry');
  if (!changeRequest || changeRequest.employeeId.toString() !== req.user.id) {
    return res.status(404).json({ success: false, message: 'Change request not found.' });
  }
  if (changeRequest.status !== 'PENDING_OTP') {
    return res.status(400).json({ success: false, message: 'This request is not awaiting OTP verification.' });
  }

  const valid = await changeRequest.verifyOtp(otp);
  if (!valid) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
  }

  // Apply the bank change
  const employee = await Employee.findById(req.user.id);
  employee.bankAccount = changeRequest.newBankDetails;
  await employee.save();

  changeRequest.status = 'APPROVED';
  await changeRequest.save();

  res.json({ success: true, message: 'OTP verified. Payroll details updated successfully.' });
});
