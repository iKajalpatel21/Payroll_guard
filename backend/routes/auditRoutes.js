const express = require('express');
const router = express.Router();
const { getAuditTrail, getAdminStats } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Admin stats dashboard
router.get('/stats', protect, authorize('admin'), getAdminStats);

// Tamper-evident audit trail (employee sees own, manager/admin sees any)
router.get('/:employeeId', protect, getAuditTrail);

module.exports = router;
