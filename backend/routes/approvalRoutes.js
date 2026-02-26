const express = require('express');
const router = express.Router();
const { getApprovals, approveChange, denyChange } = require('../controllers/approvalController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin'));

router.get('/', getApprovals);
router.get('/manager-requests', getApprovals);  // alias for legacy compatibility
router.post('/:id/approve', approveChange);
router.post('/:id/deny', denyChange);

module.exports = router;
