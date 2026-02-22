<<<<<<< HEAD
const Employee = require('../models/Employee');
const RiskEvent = require('../models/RiskEvent');
const AuditEvent = require('../models/AuditEvent');
const ChangeRequest = require('../models/ChangeRequest');
=======
const Employee       = require('../models/Employee');
const RiskEvent      = require('../models/RiskEvent');
const ChangeRequest  = require('../models/ChangeRequest');
const FraudCase      = require('../models/FraudCase');
>>>>>>> 2bc2f5fbc593d563232d80fc9990a96e9a0697bb
const { calculateRiskScore, getVerificationPath } = require('../services/riskScorer');
const { sendOtp }               = require('../services/otpService');
const { analyzeChangePattern, explainRisk } = require('../services/geminiService');
const { autoAlert, createAlert } = require('../services/alertService');
const { notifyEmployee }         = require('../services/notificationService');
const { geolocateIP }            = require('../services/geoService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Common routing numbers → bank names
const ROUTING_LOOKUP = {
  '021000021': 'JPMorgan Chase Bank, N.A.',
  '021001088': 'JPMorgan Chase Bank, N.A.',
  '021000089': 'Citibank, N.A.',
  '021272655': 'TD Bank, N.A.',
  '031176110': 'TD Bank, N.A.',
  '021200339': 'Bank of America, N.A.',
  '026009593': 'Bank of America, N.A.',
  '121000248': 'Wells Fargo Bank, N.A.',
  '121042882': 'Wells Fargo Bank, N.A.',
  '322271627': 'Wells Fargo Bank, N.A.',
  '256074974': 'Navy Federal Credit Union',
  '031100157': 'Ally Bank',
  '124303201': 'Goldman Sachs Bank USA (Marcus)',
};
// Routing prefixes associated with prepaid cards
const PREPAID_PREFIXES = ['073972181', '084003997', '091409107', '021214891', '053200983'];

// ─── GET /api/risk-check/validate-routing ─────────────────────────────────────
exports.validateRouting = asyncHandler(async (req, res) => {
  const { number } = req.query;
  if (!number || !/^\d{9}$/.test(number.trim())) {
    return res.status(400).json({ success: false, message: 'Provide a valid 9-digit routing number.' });
  }
  const n = number.trim();
  const isPrepaid = PREPAID_PREFIXES.includes(n);
  const bankName = ROUTING_LOOKUP[n] || null;
  res.json({ success: true, valid: true, bankName, isPrepaid });
});

// ─── POST /api/risk-check ─────────────────────────────────────────────────────
exports.riskCheck = asyncHandler(async (req, res) => {
  const { changeType, deviceId, newBankDetails, behavior, geo, newAddress } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  const resolvedDeviceId = deviceId || req.headers['x-device-id'] || 'UNKNOWN';

  if (changeType === 'BANK_ACCOUNT' && (!newBankDetails?.accountNumber || !newBankDetails?.routingNumber)) {
    return res.status(400).json({ success: false, message: 'newBankDetails (accountNumber, routingNumber) are required.' });
  }

  const employee = await Employee.findById(req.user.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

  if (employee.isFrozen) {
    return res.status(403).json({ success: false, message: `Your account is frozen. Reason: ${employee.frozenReason || 'Contact security staff.'}` });
  }

  // ── 1. Score risk (Base + Extra Context) ────────────────────────────────────
  const extraContext = { newRoutingNumber: newBankDetails?.routingNumber, geo, newAddress };
  const { score: baseScore, riskCodes: baseCodes } = await calculateRiskScore(employee, ip, resolvedDeviceId, extraContext);

  // ── 2. Behavior payload signals ─────────────────────────────────────────────
  let behaviorScore = 0;
  const behaviorCodes = [];
  if (behavior) {
    if (behavior.clipboardPaste) { behaviorCodes.push('CLIPBOARD_PASTE_DETECTED'); behaviorScore += 10; }
    if (behavior.directNavigation) { behaviorCodes.push('DIRECT_NAVIGATION'); behaviorScore += 10; }
    if (behavior.sessionDurationSeconds != null && behavior.sessionDurationSeconds < 60) {
      behaviorCodes.push('SHORT_SESSION'); behaviorScore += 10;
    }
  }

  // Combine both scores
  const score = Math.min(100, baseScore + behaviorScore);
  const riskCodes = [...baseCodes, ...behaviorCodes];

  // ── 3. Get recent history for Gemini ────────────────────────────────────────
  const recentHistory = await RiskEvent.find({ employeeId: employee._id })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  // ── 4. Full AI pattern analysis ─────────────────────────────────────────────
  const aiResult = await analyzeChangePattern(
    employee,
    { riskScore: score, riskCodes, ip, geo, deviceId: resolvedDeviceId, changeType, newAddress },
    recentHistory
  );

  // ── 5. Log risk event ───────────────────────────────────────────────────────
  const riskEvent = await RiskEvent.create({
    employeeId: employee._id,
    ip,
    geo,
    deviceId: resolvedDeviceId,
    action: `${changeType}_CHANGE_ATTEMPT`,
    riskScore: score,
    riskCodes,
    aiExplanation: aiResult.patternSummary,
    geminiVerdict: aiResult.verdict,
    geminiConfidence: aiResult.confidence,
    geminiRecommendation: aiResult.recommendedAction,
  });

  // ── 6. Auto-alert staff for high risk ───────────────────────────────────────
  await autoAlert(employee._id, employee.name, score, riskCodes);

<<<<<<< HEAD
  // ----- Generate Hash Chained Audit Event -----
  const lastEvent = await AuditEvent.findOne({ employeeId: employee._id }).sort({ createdAt: -1 });
  const previousHash = lastEvent ? lastEvent.currentHash : 'GENESIS';

  const auditEvent = new AuditEvent({
    employeeId: employee._id,
    action: 'DEPOSIT_CHANGE_SUBMITTED',
    decision: path,
    reasonCodes: riskCodes,
    deviceFingerprint: resolvedDeviceId,
    ipAddress: ip,
    previousHash,
    // currentHash is generated by pre-validate hook
  });
  await auditEvent.save();

  if (path === 'Allow') {
    // Update employee bank details directly
    employee.bankAccount = newBankDetails;
    // Add to trusted IP/device
=======
  // ── 7. Smart Auto-Triage Logic ──────────────────────────────────────────────
  let path = 'PENDING_MULTI_APPROVAL';
  const isKnownIP = employee.knownIPs.includes(ip);
  const isGeoMismatch = riskCodes.includes('GEOGRAPHIC_MISMATCH');

  if (aiResult.verdict === 'LIKELY_FRAUD' && aiResult.confidence >= 80) {
    path = 'BLOCK';
  } else if (aiResult.verdict === 'LIKELY_GENUINE' && aiResult.confidence >= 85) {
    if (isKnownIP) {
      path = 'AUTO_APPROVE';
    } else if (!isGeoMismatch) {
      path = 'OTP_REQUIRED';
    }
  } else if (isKnownIP && score < 70) {
    path = 'OTP_REQUIRED';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BLOCK path: Auto-create case
  // ──────────────────────────────────────────────────────────────────────────
  if (path === 'BLOCK') {
    await FraudCase.create({
      employeeId: employee._id,
      type: 'ACCOUNT_TAKEOVER',
      severity: 'CRITICAL',
      title: `Auto-blocked: ${changeType} change for ${employee.name}`,
      description: aiResult.patternSummary,
      linkedRiskEventIds: [riskEvent._id],
      aiSummary: aiResult.patternSummary,
      timeline: [{ action: 'AUTO_BLOCKED', note: `AI verdict: ${aiResult.verdict} (${aiResult.confidence}% confidence)` }],
    });

    await createAlert({
      type: 'ACCOUNT_TAKEOVER',
      severity: 'CRITICAL',
      employeeId: employee._id,
      message: `🚨 AUTO-BLOCKED: ${changeType} change for ${employee.name}. AI verdict: ${aiResult.verdict} (${aiResult.confidence}%). ${aiResult.patternSummary}`,
    });

    await notifyEmployee(employee, 'CHANGE_BLOCKED', {
      riskScore: score,
      aiMessage: aiResult.employeeMessage,
    });

    return res.status(403).json({
      success: false, blocked: true, riskScore: score, verdict: aiResult.verdict, confidence: aiResult.confidence,
      aiMessage: aiResult.employeeMessage,
      message: 'This request has been automatically blocked due to suspicious activity patterns. A fraud case has been opened and the security team has been alerted.',
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AUTO_APPROVE path
  // ──────────────────────────────────────────────────────────────────────────
  if (path === 'AUTO_APPROVE') {
    if (changeType === 'BANK_ACCOUNT') {
      employee.bankAccount = newBankDetails;
    } else {
      employee.address = newAddress;
    }
>>>>>>> 2bc2f5fbc593d563232d80fc9990a96e9a0697bb
    if (!employee.knownIPs.includes(ip)) employee.knownIPs.push(ip);
    if (!employee.knownDeviceIds.includes(resolvedDeviceId)) employee.knownDeviceIds.push(resolvedDeviceId);
    await employee.save();

    await notifyEmployee(employee, 'CHANGE_ATTEMPT', {
      riskScore: score, riskLevel: 'LOW', ip, outcome: 'Change approved automatically.', aiMessage: aiResult.employeeMessage,
    });

    return res.json({
<<<<<<< HEAD
      success: true,
      path,
      decision: path,
      riskScore: score,
      aiExplanation,
      message: 'Your payroll details have been updated successfully.',
    });
  }

  if (path === 'Challenge') {
    // Create ChangeRequest with PENDING_OTP
    const changeRequest = new ChangeRequest({
      employeeId: employee._id,
      newBankDetails,
      status: 'PENDING_OTP',
      riskScore: score,
      reasonCodes: riskCodes,
      decision: path,
      verificationMethod: 'OTP',
      riskEventId: riskEvent._id,
=======
      success: true, path, riskScore: score, verdict: aiResult.verdict, confidence: aiResult.confidence,
      aiMessage: aiResult.employeeMessage,
      message: 'Your details have been updated successfully.',
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OTP_REQUIRED path
  // ──────────────────────────────────────────────────────────────────────────
  if (path === 'OTP_REQUIRED') {
    const changeRequest = new ChangeRequest({
      employeeId: employee._id, changeType,
      newBankDetails: changeType === 'BANK_ACCOUNT' ? newBankDetails : {},
      newAddress: changeType === 'ADDRESS' ? newAddress : {},
      status: 'PENDING_OTP', riskScore: score, riskEventId: riskEvent._id,
>>>>>>> 2bc2f5fbc593d563232d80fc9990a96e9a0697bb
    });

    const plainOtp = await sendOtp(employee.email, employee.name);
    await changeRequest.setOtp(plainOtp);
    await changeRequest.save();

    await notifyEmployee(employee, 'CHANGE_ATTEMPT', {
      riskScore: score, riskLevel: 'MEDIUM', ip, outcome: 'OTP verification required.', aiMessage: aiResult.employeeMessage,
    });

    return res.status(202).json({
<<<<<<< HEAD
      success: true,
      path,
      decision: path,
      riskScore: score,
      aiExplanation,
      changeRequestId: changeRequest._id,
      message: 'A verification code has been sent to your email.',
    });
  }

  // Block (formerly MANAGER_REQUIRED, but the prompt says Block -> deny & alert)
  const changeRequest = await ChangeRequest.create({
    employeeId: employee._id,
    newBankDetails,
    status: 'DENIED',
=======
      success: true, path, riskScore: score, verdict: aiResult.verdict, confidence: aiResult.confidence,
      aiMessage: aiResult.employeeMessage, changeRequestId: changeRequest._id,
      message: 'A verification code has been sent to your registered email.',
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PENDING_MULTI_APPROVAL path (Ambiguous or Unknown IP + Low Confidence)
  // ──────────────────────────────────────────────────────────────────────────
  const changeRequest = await ChangeRequest.create({
    employeeId: employee._id,
    changeType,
    newBankDetails: changeType === 'BANK_ACCOUNT' ? newBankDetails : {},
    newAddress: changeType === 'ADDRESS' ? newAddress : {},
    status: 'PENDING_MULTI_APPROVAL',
>>>>>>> 2bc2f5fbc593d563232d80fc9990a96e9a0697bb
    riskScore: score,
    reasonCodes: riskCodes,
    decision: path,
    verificationMethod: 'None',
    riskEventId: riskEvent._id,
  });

<<<<<<< HEAD
  return res.status(403).json({
    success: false,
    path,
    decision: path,
=======
  // Notify Employee
  await notifyEmployee(employee, 'MULTI_APPROVAL_REQUESTED', {
    changeType,
    ip,
  });

  // Alert managers/staff
  await notifyEmployee({ name: 'Manager Team', email: 'managers@payrollguard.local' }, 'APPROVAL_NEEDED', {
    employeeName: employee.name,
    changeType,
    geoInfo: `${geo.city}, ${geo.region}, ${geo.countryCode} (${geo.isp})`,
    riskScore: score,
  });

  return res.status(202).json({
    success: true,
    path: 'PENDING_MULTI_APPROVAL',
>>>>>>> 2bc2f5fbc593d563232d80fc9990a96e9a0697bb
    riskScore: score,
    verdict: aiResult.verdict,
    confidence: aiResult.confidence,
    aiMessage: aiResult.employeeMessage,
    changeRequestId: changeRequest._id,
<<<<<<< HEAD
    message: 'We blocked this request due to unusually high risk behavior.',
=======
    message: 'Your request originates from an unrecognized location and requires manual review. It has been locked pending manager approval.',
>>>>>>> 2bc2f5fbc593d563232d80fc9990a96e9a0697bb
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

  // Track OTP attempts
  // For simplicity using a quick in-memory mock or simple counter on changeRequest could be added. 
  // If we wanted true fair recovery we'd track fails. Let's add a virtual or just use a generic implementation here.
  const valid = await changeRequest.verifyOtp(otp);
  if (!valid) {
    // Assuming we had an `otpFailures` field. Without schema change, just return error.
    // If we wanted to route to manager: 
    // changeRequest.status = 'PENDING_MANAGER'; await changeRequest.save(); return res...
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
  }

  const employee = await Employee.findById(req.user.id);
<<<<<<< HEAD
  employee.bankAccount = changeRequest.newBankDetails;

  // Also trust the device since OTP passed
  const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  const resolvedDeviceId = req.headers['x-device-id'] || 'UNKNOWN';
  if (!employee.knownIPs.includes(ip)) employee.knownIPs.push(ip);
  if (!employee.knownDeviceIds.includes(resolvedDeviceId)) employee.knownDeviceIds.push(resolvedDeviceId);

=======
  if (changeRequest.changeType === 'BANK_ACCOUNT') {
    employee.bankAccount = changeRequest.newBankDetails;
  } else {
    employee.address = changeRequest.newAddress;
  }
>>>>>>> 2bc2f5fbc593d563232d80fc9990a96e9a0697bb
  await employee.save();

  // Audit Event for successful OTP
  const lastEvent = await AuditEvent.findOne({ employeeId: employee._id }).sort({ createdAt: -1 });
  const previousHash = lastEvent ? lastEvent.currentHash : 'GENESIS';
  await AuditEvent.create({
    employeeId: employee._id,
    action: 'OTP_VERIFICATION_SUCCESS',
    decision: 'Allow',
    deviceFingerprint: resolvedDeviceId,
    ipAddress: ip,
    previousHash,
  });

  changeRequest.status = 'APPROVED';
  await changeRequest.save();

  res.json({ success: true, message: 'OTP verified. Details updated successfully.' });
});
