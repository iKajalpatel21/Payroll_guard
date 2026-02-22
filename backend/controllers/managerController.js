const ChangeRequest = require('../models/ChangeRequest');
const Employee = require('../models/Employee');
const AuditEvent = require('../models/AuditEvent');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── GET /api/manager/requests ────────────────────────────────────────────────
// Returns all PENDING_MANAGER requests
exports.getPendingRequests = asyncHandler(async (req, res) => {
  const requests = await ChangeRequest.find({ status: 'PENDING_MANAGER' })
    .populate('employeeId', 'name email role')
    .populate('riskEventId', 'ip deviceId riskCodes aiExplanation createdAt')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: requests.length, requests });
});

// ─── PUT /api/manager/requests/:id/approve ────────────────────────────────────
exports.approveRequest = asyncHandler(async (req, res) => {
  const changeRequest = await ChangeRequest.findById(req.params.id);
  if (!changeRequest) return res.status(404).json({ success: false, message: 'Request not found.' });
  if (changeRequest.status !== 'PENDING_MANAGER') {
    return res.status(400).json({ success: false, message: 'Request is not pending manager review.' });
  }

  // Apply bank change
  await Employee.findByIdAndUpdate(changeRequest.employeeId, {
    bankAccount: changeRequest.newBankDetails,
  });

  changeRequest.status = 'APPROVED';
  changeRequest.reviewedBy = req.user.id;
  changeRequest.reviewNote = req.body.note || '';
  changeRequest.reviewedAt = new Date();
  await changeRequest.save();

  // Audit Event for Manager Approval
  const lastEvent = await AuditEvent.findOne({ employeeId: changeRequest.employeeId }).sort({ createdAt: -1 });
  const previousHash = lastEvent ? lastEvent.currentHash : 'GENESIS';
  const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  await AuditEvent.create({
    employeeId: changeRequest.employeeId,
    action: 'MANAGER_APPROVED_DEPOSIT_CHANGE',
    decision: 'Allow',
    deviceFingerprint: req.headers['x-device-id'] || 'MANAGER_DEVICE',
    ipAddress: ip,
    previousHash,
  });

  res.json({ success: true, message: 'Request approved. Employee bank details updated.' });
});

// ─── PUT /api/manager/requests/:id/deny ──────────────────────────────────────
exports.denyRequest = asyncHandler(async (req, res) => {
  const changeRequest = await ChangeRequest.findById(req.params.id);
  if (!changeRequest) return res.status(404).json({ success: false, message: 'Request not found.' });
  if (changeRequest.status !== 'PENDING_MANAGER') {
    return res.status(400).json({ success: false, message: 'Request is not pending manager review.' });
  }

  changeRequest.status = 'DENIED';
  changeRequest.reviewedBy = req.user.id;
  changeRequest.reviewNote = req.body.note || '';
  changeRequest.reviewedAt = new Date();
  await changeRequest.save();

  // Audit Event for Manager Denial
  const lastEvent = await AuditEvent.findOne({ employeeId: changeRequest.employeeId }).sort({ createdAt: -1 });
  const previousHash = lastEvent ? lastEvent.currentHash : 'GENESIS';
  const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  await AuditEvent.create({
    employeeId: changeRequest.employeeId,
    action: 'MANAGER_DENIED_DEPOSIT_CHANGE',
    decision: 'Block',
    deviceFingerprint: req.headers['x-device-id'] || 'MANAGER_DEVICE',
    ipAddress: ip,
    previousHash,
  });

  res.json({ success: true, message: 'Request denied.' });
});
