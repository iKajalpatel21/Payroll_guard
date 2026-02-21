const express = require('express');
const router  = express.Router();
const { getAllCases, createCase, updateCase, analyzeCase, getCaseStats } = require('../controllers/fraudCaseController');
const { protect, authorize } = require('../middleware/authMiddleware');

const staffOrAdmin = authorize('staff', 'admin');

router.get('/stats',         protect, staffOrAdmin, getCaseStats);
router.get('/',              protect, staffOrAdmin, getAllCases);
router.post('/',             protect, staffOrAdmin, createCase);
router.put('/:id',           protect, staffOrAdmin, updateCase);
router.get('/:id/analyze',   protect, staffOrAdmin, analyzeCase);

module.exports = router;
