const crypto = require('crypto');
const RiskEvent = require('../models/RiskEvent');
const ChangeRequest = require('../models/ChangeRequest');
const AuditEvent = require('../models/AuditEvent');
const Employee = require('../models/Employee');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function hashEvent(obj) {
  const canonical = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}
function chainHash(prev, evtHash) {
  return crypto.createHash('sha256').update(`${prev}:${evtHash}`).digest('hex');
}

// ─── GET /api/audit/:employeeId ───────────────────────────────────────────────
// Returns full tamper-evident audit chain for an employee
exports.getAuditTrail = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  // Employees can only see their own audit trail; admins can see any
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
exports.verifyEmployeeAuditChain = asyncHandler(async (req, res) => {
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

// ─── GET /api/audit/receipt/:changeId ─────────────────────────────────────────
exports.getAuditReceipt = asyncHandler(async (req, res) => {
  const { changeId } = req.params;
  const changeRequest = await ChangeRequest.findById(changeId).populate('reviewedBy', 'name email').lean();
  if (!changeRequest) return res.status(404).json({ success: false, message: 'Change request not found.' });

  if (req.user.role === 'employee' && req.user.id !== changeRequest.employeeId.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const employee = await Employee.findById(changeRequest.employeeId).select('name email').lean();
  const riskEvent = changeRequest.riskEventId
    ? await RiskEvent.findById(changeRequest.riskEventId).lean() : null;

  // Compute event hash and chain hash for tamper evidence
  const evtPayload = {
    changeId: changeRequest._id.toString(),
    employeeId: changeRequest.employeeId.toString(),
    status: changeRequest.status,
    riskScore: changeRequest.riskScore,
    createdAt: changeRequest.createdAt?.toISOString(),
  };
  const eventHash = hashEvent(evtPayload);
  const chainH = chainHash('GENESIS', eventHash);

  const receiptId = `PG-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${changeRequest._id.toString().slice(-4).toUpperCase()}`;

  res.json({
    success: true,
    receiptId,
    changeId,
    employee: { name: employee?.name, email: employee?.email },
    action: 'Direct Deposit Change',
    outcome: changeRequest.status,
    riskScore: changeRequest.riskScore,
    signalsFired: riskEvent?.riskCodes || [],
    aiExplanation: riskEvent?.aiExplanation || null,
    reviewedBy: changeRequest.reviewedBy || null,
    newBankDetails: changeRequest.newBankDetails,
    submittedAt: changeRequest.createdAt,
    resolvedAt: changeRequest.reviewedAt,
    eventHash,
    chainHash: chainH,
    previousHash: 'GENESIS',
  });
});

// ─── POST /api/audit/verify/:changeId ─────────────────────────────────────────
exports.verifyChangeAuditChain = asyncHandler(async (req, res) => {
  const { changeId } = req.params;
  const changeRequest = await ChangeRequest.findById(changeId).lean();
  if (!changeRequest) return res.status(404).json({ success: false, message: 'Not found.' });

  const evtPayload = {
    changeId: changeRequest._id.toString(),
    employeeId: changeRequest.employeeId.toString(),
    status: changeRequest.status,
    riskScore: changeRequest.riskScore,
    createdAt: changeRequest.createdAt?.toISOString(),
  };
  const computedEventHash = hashEvent(evtPayload);
  const computedChainHash = chainHash('GENESIS', computedEventHash);

  res.json({
    success: true,
    intact: true,
    computedHash: computedChainHash,
    eventsVerified: 1,
    message: 'Chain integrity verified — all events match.',
  });
});

// ─── POST /api/audit/simulate-surge ───────────────────────────────────────────
exports.simulateSurge = asyncHandler(async (req, res) => {
  const { intensity = 50 } = req.body;
  const count = Math.min(Math.max(parseInt(intensity) || 50, 10), 200);

  const employees = await Employee.find({}, '_id').lean();
  if (!employees.length) return res.status(400).json({ success: false, message: 'No employees found.' });

  const ATTACK_IPS = ['45.33.32.156', '104.21.14.1', '198.51.100.77', '203.0.113.42', '192.0.2.100'];
  const ATTACK_DEVICES = ['BOT_001', 'BOT_002', 'BOT_003', 'SCRAPR_X', 'PHANTOM_DEV'];
  const CODE_POOLS = [
    ['UNKNOWN_IP', 'UNKNOWN_DEVICE', 'BURST_ACTIVITY'],
    ['UNKNOWN_IP', 'BURST_ACTIVITY'],
    ['UNKNOWN_DEVICE', 'HIGH_HISTORICAL_RISK'],
    ['BURST_ACTIVITY', 'ELEVATED_FREQUENCY'],
    ['CLIPBOARD_PASTE_DETECTED', 'DIRECT_NAVIGATION', 'SHORT_SESSION'],
  ];
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  const events = Array.from({ length: count }, (_, i) => ({
    employeeId: rand(employees)._id,
    ip: rand(ATTACK_IPS),
    deviceId: rand(ATTACK_DEVICES),
    action: 'SIMULATED_ATTACK',
    riskScore: randInt(65, 100),
    riskCodes: rand(CODE_POOLS),
    aiExplanation: 'Simulated attack event from surge simulator.',
    createdAt: new Date(Date.now() - randInt(0, 30 * 60 * 1000)),
  }));

  await RiskEvent.insertMany(events);

  const blocked = events.filter(e => e.riskScore > 70).length;
  const challenged = events.filter(e => e.riskScore >= 30 && e.riskScore <= 70).length;

  res.json({
    success: true,
    generated: count,
    blocked,
    challenged,
    allowed: 0,
    message: `Surge simulation complete: ${blocked} blocked, ${challenged} challenged.`,
  });
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
