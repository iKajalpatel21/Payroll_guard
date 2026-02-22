const express = require('express');
const router = express.Router();
const { getApprovals, approveChange, denyChange } = require('../controllers/approvalController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('manager', 'staff', 'admin'));

router.get('/', getApprovals);
router.post('/:id/approve', approveChange);
router.post('/:id/deny', denyChange);

module.exports = router;
