const Alert    = require('../models/Alert');

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
