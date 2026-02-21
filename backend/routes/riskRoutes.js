const express = require('express');
const router = express.Router();
const { riskCheck, verifyOtp } = require('../controllers/riskController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Only authenticated employees can submit a deposit change
router.post('/', protect, authorize('employee', 'manager', 'admin'), riskCheck);
router.post('/verify-otp', protect, verifyOtp);

module.exports = router;
