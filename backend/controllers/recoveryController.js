const Employee  = require('../models/Employee');
const Payroll   = require('../models/Payroll');
const RiskEvent = require('../models/RiskEvent');
const { createAlert } = require('../services/alertService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── POST /api/recovery/freeze/:employeeId ────────────────────────────────────
exports.freezeAccount = asyncHandler(async (req, res) => {
  const emp = await Employee.findById(req.params.employeeId);
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found.' });

  emp.isFrozen     = true;
  emp.frozenReason = req.body.reason || 'Account frozen by security staff.';
  emp.frozenAt     = new Date();
  emp.frozenBy     = req.user.id;
  await emp.save();

  // Auto-create alert
  await createAlert({
    type:       'ACCOUNT_FROZEN',
    severity:   'CRITICAL',
    employeeId: emp._id,
    message:    `🔒 ${emp.name}'s account has been frozen. Reason: ${emp.frozenReason}`,
  });

  res.json({ success: true, message: `Account for ${emp.name} has been frozen.` });
});

// ─── POST /api/recovery/unfreeze/:employeeId ──────────────────────────────────
exports.unfreezeAccount = asyncHandler(async (req, res) => {
  const emp = await Employee.findById(req.params.employeeId);
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found.' });

  emp.isFrozen     = false;
  emp.frozenReason = '';
  emp.frozenAt     = undefined;
  emp.frozenBy     = undefined;
  await emp.save();

  res.json({ success: true, message: `Account for ${emp.name} has been unfrozen.` });
});

// ─── POST /api/recovery/reset-bank/:employeeId ───────────────────────────────
// Reverts employee bank details and clears their knownIPs/devices (start fresh)
exports.resetBankDetails = asyncHandler(async (req, res) => {
  const { accountNumber, routingNumber, bankName } = req.body;
  if (!accountNumber || !routingNumber) {
    return res.status(400).json({ success: false, message: 'accountNumber and routingNumber are required.' });
  }

  const emp = await Employee.findById(req.params.employeeId);
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found.' });

  emp.bankAccount = { accountNumber, routingNumber, bankName: bankName || '' };
  // Reset trust lists so next login re-establishes known devices
  emp.knownIPs       = [];
  emp.knownDeviceIds = [];
  await emp.save();

  await createAlert({
    type:       'ACCOUNT_FROZEN',   // reusing type for tracking
    severity:   'WARNING',
    employeeId: emp._id,
    message:    `🏦 Bank details for ${emp.name} were manually reset by security staff.`,
  });

  res.json({ success: true, message: `Bank details for ${emp.name} have been reset. Trust lists cleared.` });
});

// ─── GET /api/recovery/employees ─────────────────────────────────────────────
// Staff: search all employees with their risk summary
exports.searchEmployees = asyncHandler(async (req, res) => {
  const q = req.query.q || '';
  const employees = await Employee.find(
    q ? { $or: [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }] } : {}
  ).select('-passwordHash').limit(20);

  // Attach a quick risk summary per employee
  const enriched = await Promise.all(employees.map(async (emp) => {
    const [eventCount, highRiskCount, heldPayroll] = await Promise.all([
      RiskEvent.countDocuments({ employeeId: emp._id }),
      RiskEvent.countDocuments({ employeeId: emp._id, riskScore: { $gt: 70 } }),
      Payroll.countDocuments({ employeeId: emp._id, status: 'HELD' }),
    ]);
    return {
      ...emp.toObject(),
      riskSummary: { eventCount, highRiskCount, heldPayroll },
    };
  }));

  res.json({ success: true, employees: enriched });
});
