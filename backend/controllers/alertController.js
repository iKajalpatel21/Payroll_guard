const Alert = require('../models/Alert');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── GET /api/alerts ──────────────────────────────────────────────────────────
exports.getAlerts = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.unread === 'true') filter.isRead = false;
  if (req.query.severity) filter.severity = req.query.severity;

  const alerts = await Alert.find(filter)
    .populate('employeeId', 'name email')
    .populate('linkedCaseId', 'title status')
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ success: true, count: alerts.length, alerts });
});

// ─── PUT /api/alerts/:id/read ─────────────────────────────────────────────────
exports.markRead = asyncHandler(async (req, res) => {
  await Alert.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ success: true });
});

// ─── PUT /api/alerts/read-all ─────────────────────────────────────────────────
exports.markAllRead = asyncHandler(async (req, res) => {
  await Alert.updateMany({ isRead: false }, { isRead: true });
  res.json({ success: true, message: 'All alerts marked as read.' });
});

// ─── GET /api/alerts/unread-count ─────────────────────────────────────────────
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Alert.countDocuments({ isRead: false });
  res.json({ success: true, count });
});

// ─── POST /api/alerts/simulate-surge ──────────────────────────────────────────
// Admin endpoint to simulate an attack wave (50-200 attempts)
exports.simulateSurge = asyncHandler(async (req, res) => {
  const count = req.body.count || 50;
  if (count < 1 || count > 500) {
    return res.status(400).json({ success: false, message: 'Count must be between 1 and 500.' });
  }

  // Get some random employees to attack
  const Employee = require('../models/Employee');
  const employees = await Employee.find({ role: 'employee' }).limit(10);
  if (employees.length === 0) {
    return res.status(400).json({ success: false, message: 'No employees found to simulate attack against.' });
  }

  const RiskEvent = require('../models/RiskEvent');
  const eventsToInsert = [];
  const alertsToInsert = [];

  const maliciousIPs = ['192.168.1.99', '203.0.113.42', '198.51.100.17', '185.15.22.4', '45.33.32.156', '89.187.169.39'];
  const maliciousDevices = ['ATTACK_DEVICE_XA1', 'ATTACK_DEVICE_XA2', 'UNKNOWN_LINUX_BOT', 'TOR_EXIT_NODE_DEV'];
  const now = new Date();

  const attackScenarios = [
    {
      action: 'DEPOSIT_CHANGE_ATTEMPT',
      baseScore: 85,
      codes: ['ERR_LOC_NEW', 'ERR_DEV_NOVEL', 'ERR_VELOCITY_HIGH'],
      explanation: 'Blocked: High velocity of deposit change attempts from an unverified device in a new location.',
      alertType: 'CREDENTIAL_STUFFING',
      severity: 'CRITICAL',
      alertMsg: 'High velocity credential stuffing attack detected targeting deposit settings.'
    },
    {
      action: 'LOGIN_ATTEMPT',
      baseScore: 75,
      codes: ['ERR_IMPOSSIBLE_TRAVEL', 'ERR_DEV_NOVEL'],
      explanation: 'Blocked: Impossible travel detected. User logged in from New York 30 minutes ago, now attempting access from Eastern Europe.',
      alertType: 'IMPOSSIBLE_TRAVEL',
      severity: 'HIGH',
      alertMsg: 'Impossible travel sign-in blocked from Eastern European IP.'
    },
    {
      action: 'API_KEY_ACCESS',
      baseScore: 95,
      codes: ['ERR_KNOWN_BOTNET', 'ERR_IP_BLACKLIST'],
      explanation: 'Critical Block: Request originated from a known malicious botnet IP address associated with ransomware gangs.',
      alertType: 'MALICIOUS_IP',
      severity: 'CRITICAL',
      alertMsg: 'Attempted access from known ransomware botnet IP blocked.'
    },
    {
      action: 'PASSWORD_RESET_ATTEMPT',
      baseScore: 80,
      codes: ['ERR_TIME_ANOMALY', 'ERR_DEV_NOVEL'],
      explanation: 'Suspicious password reset requested at 3:00 AM local time from an unrecognized TOR exit node.',
      alertType: 'SUSPICIOUS_RESET',
      severity: 'MEDIUM',
      alertMsg: 'After-hours password reset requested from TOR network.'
    }
  ];

  for (let i = 0; i < count; i++) {
    const emp = employees[Math.floor(Math.random() * employees.length)];
    const ip = maliciousIPs[Math.floor(Math.random() * maliciousIPs.length)];
    const deviceId = maliciousDevices[Math.floor(Math.random() * maliciousDevices.length)];
    const scenario = attackScenarios[Math.floor(Math.random() * attackScenarios.length)];

    // Add some randomness to the score
    const score = Math.min(100, scenario.baseScore + Math.floor(Math.random() * 10) - 5);
    const timeOffset = new Date(now.getTime() - Math.floor(Math.random() * 3600000)); // Last hour

    eventsToInsert.push({
      employeeId: emp._id,
      ip,
      deviceId,
      action: scenario.action,
      riskScore: score,
      riskCodes: scenario.codes,
      aiExplanation: scenario.explanation,
      createdAt: timeOffset,
      updatedAt: timeOffset
    });

    if (i % 5 === 0) { // Only create alerts for every 5th to avoid spam
      alertsToInsert.push({
        type: scenario.alertType,
        severity: scenario.severity,
        employeeId: emp._id,
        message: `Surge Simulator: ${scenario.alertMsg} (Target: ${emp.name}, IP: ${ip})`,
        isRead: false,
        createdAt: timeOffset,
        updatedAt: timeOffset
      });
    }
  }

  await RiskEvent.insertMany(eventsToInsert);
  if (alertsToInsert.length > 0) {
    await Alert.insertMany(alertsToInsert);
  }

  res.json({
    success: true,
    message: `Surge simulated successfully. Injected ${count} detailed risk events and ${alertsToInsert.length} alerts.`
  });
});
