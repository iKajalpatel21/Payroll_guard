const express = require('express');
const router = express.Router();
const { getPendingRequests, approveRequest, denyRequest } = require('../controllers/managerController');
const { protect, authorize } = require('../middleware/authMiddleware');

const managerOrAdmin = authorize('manager', 'admin');

router.get('/requests',              protect, managerOrAdmin, getPendingRequests);
router.put('/requests/:id/approve',  protect, managerOrAdmin, approveRequest);
router.put('/requests/:id/deny',     protect, managerOrAdmin, denyRequest);

module.exports = router;
