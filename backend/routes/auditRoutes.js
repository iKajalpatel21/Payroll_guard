const express = require('express');
const router = express.Router();
const { getAuditTrail, getAdminStats, getAuditChain, verifyAuditChain } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Admin stats dashboard
router.get('/stats', protect, authorize('admin'), getAdminStats);

// Verify chain integrity
router.post('/verify', protect, authorize('admin', 'staff'), verifyAuditChain);

// Tamper-evident audit chain specific
router.get('/chain/:employeeId', protect, getAuditChain);

// Timeline trail
router.get('/:employeeId', protect, getAuditTrail);

module.exports = router;
