const Employee      = require('../models/Employee');
const RiskEvent     = require('../models/RiskEvent');
const ChangeRequest = require('../models/ChangeRequest');
const Payroll       = require('../models/Payroll');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── GET /api/me/profile ──────────────────────────────────────────────────────
exports.getProfile = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.user.id).select('-passwordHash');
  res.json({ success: true, employee });
});

// ─── PUT /api/me/address ──────────────────────────────────────────────────────
// Updates address directly (low-risk action — no risk scoring needed for address)
exports.updateAddress = asyncHandler(async (req, res) => {
  const { street, city, state, zip, country } = req.body;
  if (!street || !city || !state || !zip) {
    return res.status(400).json({ success: false, message: 'street, city, state, and zip are required.' });
  }

  const employee = await Employee.findById(req.user.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });
  if (employee.isFrozen) return res.status(403).json({ success: false, message: 'Account is frozen.' });

  employee.address = { street, city, state, zip, country: country || 'US' };
  await employee.save();

  // Notify employee of address change
  const { notifyEmployee } = require('../services/notificationService');
  await notifyEmployee(employee, 'ADDRESS_CHANGE', {
    newAddress: `${street}, ${city}, ${state} ${zip}, ${country || 'US'}`,
  });

  res.json({ success: true, message: 'Address updated successfully.', address: employee.address });
});

// ─── POST /api/me/baseline ────────────────────────────────────────────────────
// First-time onboarding: sets initial bank and address details.
// Bypasses risk checks, but ONLY works if both are currently missing.
exports.setBaseline = asyncHandler(async (req, res) => {
  const { newBankDetails, newAddress, deviceId } = req.body;
  if (!newBankDetails || !newAddress) {
    return res.status(400).json({ success: false, message: 'Bank details and address are required.' });
  }

  const employee = await Employee.findById(req.user.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

  // Only allow if NO existing bank account is set
  if (employee.bankAccount && employee.bankAccount.accountNumber) {
    return res.status(403).json({ success: false, message: 'Baseline is already set. Please use the standard change process.' });
  }

  employee.bankAccount = newBankDetails;
  employee.address = newAddress;

  // Save the IP and Device ID as known baseline
  const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  const resolvedDeviceId = deviceId || req.headers['x-device-id'] || 'UNKNOWN';

  if (!employee.knownIPs.includes(ip)) employee.knownIPs.push(ip);
  if (!employee.knownDeviceIds.includes(resolvedDeviceId)) employee.knownDeviceIds.push(resolvedDeviceId);

  await employee.save();

  // Notify employee of onboarding
  const { notifyEmployee } = require('../services/notificationService');
  await notifyEmployee(employee, 'ADDRESS_CHANGE', {
    newAddress: `${newAddress.street}, ${newAddress.city}, ${newAddress.state} ${newAddress.zip}, ${newAddress.country || 'US'}`,
    time: new Date().toLocaleString(),
  });

  res.json({ success: true, message: 'Baseline details saved successfully.' });
});

// ─── GET /api/me/activity ─────────────────────────────────────────────────────
// Unified security activity feed for the employee (like Google's security page)
exports.getActivity = asyncHandler(async (req, res) => {
  const empId = req.user.id;

  const [riskEvents, changeRequests, payrolls] = await Promise.all([
    RiskEvent.find({ employeeId: empId }).sort({ createdAt: -1 }).limit(30).lean(),
    ChangeRequest.find({ employeeId: empId }).sort({ createdAt: -1 }).limit(20).lean(),
    Payroll.find({ employeeId: empId }).sort({ payDate: -1 }).limit(12).lean(),
  ]);

  // Merge into a single timeline
  const timeline = [
    ...riskEvents.map(e => ({
      type:      'RISK_EVENT',
      icon:      e.riskScore > 70 ? '🚨' : e.riskScore > 30 ? '⚠️' : '✅',
      title:     `${e.action?.replace(/_/g, ' ')}`,
      detail:    e.aiExplanation || `Risk score: ${e.riskScore}`,
      riskScore: e.riskScore,
      verdict:   e.geminiVerdict,
      confidence: e.geminiConfidence,
      ip:        e.ip,
      deviceId:  e.deviceId,
      ts:        e.createdAt,
    })),
    ...changeRequests.map(c => ({
      type:   'CHANGE_REQUEST',
      icon:   c.status === 'APPROVED' ? '✅' : c.status === 'DENIED' ? '❌' : '⏳',
      title:  `${c.changeType === 'ADDRESS' ? 'Address' : 'Bank'} change — ${c.status.replace(/_/g, ' ')}`,
      detail: `Risk score: ${c.riskScore}`,
      riskScore: c.riskScore,
      ts:     c.createdAt,
    })),
    ...payrolls.map(p => ({
      type:   'PAYROLL',
      icon:   p.status === 'PAID' ? '💰' : p.status === 'HELD' ? '⏸️' : '⏳',
      title:  `Payroll cycle ${p.cycleId} — ${p.status}`,
      detail: p.holdReason || `Amount: $${p.amount?.toLocaleString()}`,
      ts:     p.payDate,
    })),
  ].sort((a, b) => new Date(b.ts) - new Date(a.ts));

  res.json({ success: true, timeline });
});
