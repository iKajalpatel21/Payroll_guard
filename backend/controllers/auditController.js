const RiskEvent = require('../models/RiskEvent');
const ChangeRequest = require('../models/ChangeRequest');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── GET /api/audit/:employeeId ───────────────────────────────────────────────
// Returns full tamper-evident audit chain for an employee
exports.getAuditTrail = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  // Employees can only see their own audit trail; managers/admins can see any
  if (req.user.role === 'employee' && req.user.id !== employeeId) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const riskEvents = await RiskEvent.find({ employeeId })
    .sort({ createdAt: 1 })
    .lean();

  const changeRequests = await ChangeRequest.find({ employeeId })
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: 1 })
    .lean();

  // Merge into a single timeline
  const timeline = [
    ...riskEvents.map((e) => ({ ...e, _type: 'RISK_EVENT' })),
    ...changeRequests.map((c) => ({ ...c, _type: 'CHANGE_REQUEST' })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({ success: true, employeeId, count: timeline.length, timeline });
});

// ─── GET /api/audit/stats (admin) ─────────────────────────────────────────────
// Global stats for the admin dashboard
exports.getAdminStats = asyncHandler(async (req, res) => {
  const [totalEvents, highRiskEvents, pendingRequests, approvedToday] = await Promise.all([
    RiskEvent.countDocuments(),
    RiskEvent.countDocuments({ riskScore: { $gt: 70 } }),
    ChangeRequest.countDocuments({ status: 'PENDING_MANAGER' }),
    ChangeRequest.countDocuments({
      status: 'APPROVED',
      reviewedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
  ]);

  // Top 5 employees by risk (aggregation)
  const topRisk = await RiskEvent.aggregate([
    { $group: { _id: '$employeeId', avgScore: { $avg: '$riskScore' }, eventCount: { $sum: 1 } } },
    { $sort: { avgScore: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'employee' } },
    { $unwind: '$employee' },
    { $project: { 'employee.name': 1, 'employee.email': 1, avgScore: 1, eventCount: 1 } },
  ]);

  res.json({
    success: true,
    stats: { totalEvents, highRiskEvents, pendingRequests, approvedToday },
    topRisk,
  });
});
