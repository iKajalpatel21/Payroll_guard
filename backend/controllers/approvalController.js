const ChangeRequest = require('../models/ChangeRequest');
const RiskEvent = require('../models/RiskEvent');
const Employee = require('../models/Employee');
const AuditEvent = require('../models/AuditEvent');
const { notifyEmployee } = require('../services/notificationService');
const FraudCase = require('../models/FraudCase');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── GET /api/approvals ───────────────────────────────────────────────────────
// Returns all PENDING_MULTI_APPROVAL + PENDING_ADMIN_REVIEW requests
exports.getApprovals = asyncHandler(async (req, res) => {
  const requests = await ChangeRequest.find({
    status: { $in: ['PENDING_MULTI_APPROVAL', 'PENDING_ADMIN_REVIEW'] }
  })
    .populate('employeeId', 'name email role')
    .populate('riskEventId')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, requests });
});

// ─── POST /api/approvals/:id/approve ──────────────────────────────────────────
exports.approveChange = asyncHandler(async (req, res) => {
  const request = await ChangeRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
  if (!['PENDING_MULTI_APPROVAL', 'PENDING_ADMIN_REVIEW'].includes(request.status)) {
    return res.status(400).json({ success: false, message: 'Request is not pending admin review.' });
  }

  const employee = await Employee.findById(request.employeeId);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

  // Apply change
  if (request.changeType === 'BANK_ACCOUNT') {
    employee.bankAccount = request.newBankDetails;
  } else {
    employee.address = request.newAddress;
  }

  // Trust the IP/Device that made the original request
  const riskEvent = await RiskEvent.findById(request.riskEventId);
  if (riskEvent) {
    if (!employee.knownIPs.includes(riskEvent.ip)) employee.knownIPs.push(riskEvent.ip);
    if (!employee.knownDeviceIds.includes(riskEvent.deviceId)) employee.knownDeviceIds.push(riskEvent.deviceId);
  }
  await employee.save();

  request.status = 'APPROVED';
  request.reviewedBy = req.user.id;
  request.reviewNote = req.body.note || '';
  request.reviewedAt = new Date();
  await request.save();

  // Audit Event
  const lastEvent = await AuditEvent.findOne({ employeeId: employee._id }).sort({ createdAt: -1 });
  const previousHash = lastEvent ? lastEvent.currentHash : 'GENESIS';
  const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  await AuditEvent.create({
    employeeId: employee._id,
    action: 'ADMIN_APPROVED_DEPOSIT_CHANGE',
    decision: 'Allow',
    deviceFingerprint: req.headers['x-device-id'] || 'ADMIN_DEVICE',
    ipAddress: ip,
    previousHash,
  });

  await notifyEmployee(employee, 'CHANGE_APPROVED_BY_MANAGER', {
    changeType: request.changeType,
    approvedBy: req.user.name || 'Admin',
  });

  res.json({ success: true, message: 'Change approved successfully.' });
});

// ─── POST /api/approvals/:id/deny ─────────────────────────────────────────────
exports.denyChange = asyncHandler(async (req, res) => {
  const request = await ChangeRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
  if (!['PENDING_MULTI_APPROVAL', 'PENDING_ADMIN_REVIEW'].includes(request.status)) {
    return res.status(400).json({ success: false, message: 'Request is not pending admin review.' });
  }

  const employee = await Employee.findById(request.employeeId);

  request.status = 'DENIED';
  request.reviewedBy = req.user.id;
  request.reviewNote = req.body.note || '';
  request.reviewedAt = new Date();
  await request.save();

  // Audit Event
  const lastEvent = await AuditEvent.findOne({ employeeId: request.employeeId }).sort({ createdAt: -1 });
  const previousHash = lastEvent ? lastEvent.currentHash : 'GENESIS';
  const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
  await AuditEvent.create({
    employeeId: request.employeeId,
    action: 'ADMIN_DENIED_DEPOSIT_CHANGE',
    decision: 'Block',
    deviceFingerprint: req.headers['x-device-id'] || 'ADMIN_DEVICE',
    ipAddress: ip,
    previousHash,
  });

  await FraudCase.create({
    employeeId: request.employeeId,
    type: 'ACCOUNT_TAKEOVER',
    severity: 'HIGH',
    title: `Admin Denied ${request.changeType} Change`,
    description: `A pending admin review request was reviewed and denied by ${req.user.name || 'Admin'}.`,
    linkedRiskEventIds: [request.riskEventId],
  });

  if (employee) {
    await notifyEmployee(employee, 'CHANGE_DENIED', {
      changeType: request.changeType,
      deniedBy: req.user.name || 'Admin',
    });
  }

  res.json({ success: true, message: 'Change denied.' });
});
