const express = require('express');
const router = express.Router();
const { getAlerts, markRead, markAllRead, getUnreadCount, simulateSurge } = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/authMiddleware');

const adminOnly = authorize('admin');

router.get('/', protect, adminOnly, getAlerts);
router.get('/unread-count', protect, adminOnly, getUnreadCount);
router.post('/simulate-surge', protect, adminOnly, simulateSurge);
router.put('/read-all', protect, adminOnly, markAllRead);
router.put('/:id/read', protect, adminOnly, markRead);

module.exports = router;
