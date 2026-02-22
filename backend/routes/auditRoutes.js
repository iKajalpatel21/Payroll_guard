const express = require('express');
const router = express.Router();
const {
  getAuditTrail,
  getAdminStats,
  getAuditReceipt,
  verifyAuditChain,
  simulateSurge,
} = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Admin stats dashboard
router.get('/stats', protect, authorize('admin', 'staff'), getAdminStats);

// Surge simulator (admin only)
router.post('/simulate-surge', protect, authorize('admin'), simulateSurge);

// Audit receipt for a specific change request
router.get('/receipt/:changeId', protect, getAuditReceipt);

// Verify audit chain integrity for a specific change request
router.post('/verify/:changeId', protect, verifyChangeAuditChain);

// Verify chain integrity
router.post('/verify', protect, authorize('admin', 'staff'), verifyEmployeeAuditChain);

// Tamper-evident audit chain specific
router.get('/chain/:employeeId', protect, getAuditChain);

// Timeline trail
router.get('/:employeeId', protect, getAuditTrail);

module.exports = router;
