const express = require('express');
const router  = express.Router();
const { getAllCases, createCase, updateCase, analyzeCase, getCaseStats, freezeAccount, holdTransaction } = require('../controllers/fraudCaseController');
const { protect, authorize } = require('../middleware/authMiddleware');

const adminOnly = authorize('admin');

router.get('/stats',         protect, adminOnly, getCaseStats);
router.get('/',              protect, adminOnly, getAllCases);
router.post('/',             protect, adminOnly, createCase);
router.put('/:id',           protect, adminOnly, updateCase);
router.get('/:id/analyze',   protect, adminOnly, analyzeCase);
router.post('/:id/freeze',   protect, adminOnly, freezeAccount);
router.post('/:id/hold',     protect, adminOnly, holdTransaction);

module.exports = router;
