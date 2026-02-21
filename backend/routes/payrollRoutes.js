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

const managerOrAdmin = authorize('manager', 'admin');

// Manual run + stats (admin/manager only)
router.post('/run',          protect, managerOrAdmin, triggerPayroll);
router.get('/stats',         protect, managerOrAdmin, getPayrollStats);
router.get('/cycles',        protect, managerOrAdmin, getCycles);
router.get('/',              protect, managerOrAdmin, getAllPayrolls);
router.put('/:id/release',   protect, managerOrAdmin, releasePayroll);

// Employee: own payroll history
router.get('/my', protect, getMyPayrolls);

module.exports = router;
