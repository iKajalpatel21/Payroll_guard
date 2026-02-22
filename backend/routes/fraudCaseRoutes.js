const express = require('express');
const router  = express.Router();
const { getAllCases, createCase, updateCase, analyzeCase, getCaseStats, freezeAccount, holdTransaction } = require('../controllers/fraudCaseController');
const { protect, authorize } = require('../middleware/authMiddleware');

const adminManagerStaff = authorize('admin', 'manager', 'staff');
const staffOrAdmin = authorize('admin', 'staff', 'manager');

router.get('/stats',         protect, staffOrAdmin, getCaseStats);
router.get('/',              protect, adminManagerStaff, getAllCases);
router.post('/',             protect, staffOrAdmin, createCase);
router.put('/:id',           protect, adminManagerStaff, updateCase);
router.get('/:id/analyze',   protect, adminManagerStaff, analyzeCase);
router.post('/:id/freeze',   protect, adminManagerStaff, freezeAccount);
router.post('/:id/hold',     protect, adminManagerStaff, holdTransaction);

module.exports = router;
