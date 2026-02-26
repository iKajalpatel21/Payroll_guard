const express = require('express');
const router  = express.Router();
const {
  triggerPayroll,
  getAllPayrolls,
  getMyPayrolls,
  getCycles,
  releasePayroll,
  getPayrollStats,
} = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/authMiddleware');

const adminOnly = authorize('admin');

// Manual run + stats (admin only)
router.post('/run',          protect, adminOnly, triggerPayroll);
router.get('/stats',         protect, adminOnly, getPayrollStats);
router.get('/cycles',        protect, adminOnly, getCycles);
router.get('/',              protect, adminOnly, getAllPayrolls);
router.put('/:id/release',   protect, adminOnly, releasePayroll);

// Employee: own payroll history
router.get('/my', protect, getMyPayrolls);

module.exports = router;
