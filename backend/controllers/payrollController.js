const Payroll   = require('../models/Payroll');
const { runPayrollCycle } = require('../services/payrollService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── POST /api/payroll/run  (admin/manager – manual trigger) ─────────────────
exports.triggerPayroll = asyncHandler(async (req, res) => {
  const payDate = req.body.payDate ? new Date(req.body.payDate) : new Date();

  const results = await runPayrollCycle({
    payDate,
    defaultAmount: req.body.defaultAmount || 3500,
  });

  if (results.skipped) {
    return res.status(409).json({
      success: false,
      message: `Payroll cycle ${results.cycleId} has already been processed.`,
    });
  }

  res.json({ success: true, results });
});

// ─── GET /api/payroll  (admin/manager – all payrolls across cycles) ──────────
exports.getAllPayrolls = asyncHandler(async (req, res) => {
  const { cycleId, status } = req.query;
  const filter = {};
  if (cycleId) filter.cycleId = cycleId;
  if (status)  filter.status  = status;

  const payrolls = await Payroll.find(filter)
    .populate('employeeId', 'name email role')
    .populate('flaggedChangeRequestId', 'riskScore riskCodes')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: payrolls.length, payrolls });
});

// ─── GET /api/payroll/my  (employee – see own payroll history) ───────────────
exports.getMyPayrolls = asyncHandler(async (req, res) => {
  const payrolls = await Payroll.find({ employeeId: req.user.id })
    .sort({ payDate: -1 });

  res.json({ success: true, count: payrolls.length, payrolls });
});

// ─── GET /api/payroll/cycles  (admin – list distinct cycle IDs) ──────────────
exports.getCycles = asyncHandler(async (req, res) => {
  const cycles = await Payroll.distinct('cycleId');
  res.json({ success: true, cycles: cycles.sort().reverse() });
});

// ─── PUT /api/payroll/:id/release  (admin/manager – release a HELD payroll) ──
exports.releasePayroll = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findById(req.params.id);
  if (!payroll) return res.status(404).json({ success: false, message: 'Payroll record not found.' });
  if (payroll.status !== 'HELD') return res.status(400).json({ success: false, message: 'Payroll is not currently held.' });

  payroll.status      = 'PAID';
  payroll.releasedBy  = req.user.id;
  payroll.releasedAt  = new Date();
  payroll.releaseNote = req.body.note || 'Manually released by manager/admin.';
  await payroll.save();

  res.json({ success: true, message: 'Payroll released and marked as PAID.' });
});

// ─── GET /api/payroll/stats  (admin) ─────────────────────────────────────────
exports.getPayrollStats = asyncHandler(async (req, res) => {
  const [total, paid, held, pending] = await Promise.all([
    Payroll.countDocuments(),
    Payroll.countDocuments({ status: 'PAID' }),
    Payroll.countDocuments({ status: 'HELD' }),
    Payroll.countDocuments({ status: 'PENDING' }),
  ]);

  const recentCycles = await Payroll.aggregate([
    { $group: { _id: '$cycleId', paid: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] } }, held: { $sum: { $cond: [{ $eq: ['$status', 'HELD'] }, 1, 0] } }, total: { $sum: 1 } } },
    { $sort: { _id: -1 } },
    { $limit: 5 },
  ]);

  res.json({ success: true, stats: { total, paid, held, pending }, recentCycles });
});
