const ChangeRequest = require('../models/ChangeRequest');
const RiskEvent = require('../models/RiskEvent');
const Employee = require('../models/Employee');
const { notifyEmployee } = require('../services/notificationService');
const FraudCase = require('../models/FraudCase');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── GET /api/approvals ───────────────────────────────────────────────────────
exports.getApprovals = asyncHandler(async (req, res) => {
  const requests = await ChangeRequest.find({ status: 'PENDING_MULTI_APPROVAL' })
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
  if (request.status !== 'PENDING_MULTI_APPROVAL') return res.status(400).json({ success: false, message: 'Not pending multi-approval.' });

  const employee = await Employee.findById(request.employeeId);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

  // Apply change
  if (request.changeType === 'BANK_ACCOUNT') {
    employee.bankAccount = request.newBankDetails;
  } else {
    employee.address = request.newAddress;
  }

  // Auto-trust the IP/Device that made the request (pulled from riskEvent if needed, or we just trust it on next login)
  const riskEvent = await RiskEvent.findById(request.riskEventId);
  if (riskEvent) {
    if (!employee.knownIPs.includes(riskEvent.ip)) employee.knownIPs.push(riskEvent.ip);
    if (!employee.knownDeviceIds.includes(riskEvent.deviceId)) employee.knownDeviceIds.push(riskEvent.deviceId);
  }

  await employee.save();

  request.status = 'APPROVED';
  request.approvedBy = req.user.id;
  await request.save();

  // Notify employee
  await notifyEmployee(employee, 'CHANGE_APPROVED_BY_MANAGER', {
    changeType: request.changeType,
    approvedBy: req.user.name,
  });

  res.json({ success: true, message: 'Change approved successfully.' });
});

// ─── POST /api/approvals/:id/deny ─────────────────────────────────────────────
exports.denyChange = asyncHandler(async (req, res) => {
  const request = await ChangeRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
  if (request.status !== 'PENDING_MULTI_APPROVAL') return res.status(400).json({ success: false, message: 'Not pending multi-approval.' });

  const employee = await Employee.findById(request.employeeId);

  request.status = 'DENIED';
  request.deniedBy = req.user.id;
  await request.save();

  // Optionally open a fraud case for a denied request
  await FraudCase.create({
    employeeId: request.employeeId,
    type: 'ACCOUNT_TAKEOVER',
    severity: 'HIGH',
    title: `Manager/Staff Denied ${request.changeType} Change`,
    description: `A pending multi-approval request from an unrecognized location was reviewed and denied by ${req.user.name}.`,
    linkedRiskEventIds: [request.riskEventId],
  });

  if (employee) {
    await notifyEmployee(employee, 'CHANGE_DENIED', {
      changeType: request.changeType,
      deniedBy: req.user.name,
    });
  }

  res.json({ success: true, message: 'Change denied.' });
});
