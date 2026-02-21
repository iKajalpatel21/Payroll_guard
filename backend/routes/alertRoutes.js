const express = require('express');
const router  = express.Router();
const { getAlerts, markRead, markAllRead, getUnreadCount } = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/authMiddleware');

const staffOrAdmin = authorize('staff', 'admin', 'manager');

router.get('/',              protect, staffOrAdmin, getAlerts);
router.get('/unread-count',  protect, staffOrAdmin, getUnreadCount);
router.put('/read-all',      protect, staffOrAdmin, markAllRead);
router.put('/:id/read',      protect, staffOrAdmin, markRead);

module.exports = router;
