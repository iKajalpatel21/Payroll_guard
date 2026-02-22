const RiskEvent = require('../models/RiskEvent');
const ChangeRequest = require('../models/ChangeRequest');
const AuditEvent = require('../models/AuditEvent');

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

// ─── GET /api/audit/chain/:employeeId ─────────────────────────────────────────
// Returns strictly the tamper-evident AuditEvent chain
exports.getAuditChain = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  if (req.user.role === 'employee' && req.user.id !== employeeId) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const events = await AuditEvent.find({ employeeId })
    .sort({ createdAt: 1 })
    .lean();

  res.json({ success: true, events });
});

// ─── POST /api/audit/verify ───────────────────────────────────────────────────
// Admin endpoint to verify chain integrity
exports.verifyAuditChain = asyncHandler(async (req, res) => {
  const { employeeId } = req.body;
  if (!employeeId) {
    return res.status(400).json({ success: false, message: 'Employee ID required' });
  }

  const events = await AuditEvent.find({ employeeId }).sort({ createdAt: 1 });
  if (events.length === 0) {
    return res.json({ success: true, isIntact: true, message: 'No events found.' });
  }

  const crypto = require('crypto');
  let expectedPreviousHash = 'GENESIS';

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Check link to previous event
    if (event.previousHash !== expectedPreviousHash) {
      return res.json({
        success: true,
        isIntact: false,
        message: `Chain broken at event index ${i}. Previous hash mismatch.`,
        brokenEvent: event
      });
    }

    // Check internal integrity
    const dataString = `${event.employeeId}-${event.action}-${event.decision}-${event.reasonCodes.join(',')}-${event.deviceFingerprint}-${event.ipAddress}-${event.previousHash}-${event.createdAt}`;
    const computedHash = crypto.createHash('sha256').update(dataString).digest('hex');

    if (computedHash !== event.currentHash) {
      return res.json({
        success: true,
        isIntact: false,
        message: `Data tampered at event index ${i}. Computed hash mismatch.`,
        brokenEvent: event
      });
    }

    expectedPreviousHash = event.currentHash;
  }

  res.json({ success: true, isIntact: true, message: 'Audit chain is perfectly intact.' });
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
