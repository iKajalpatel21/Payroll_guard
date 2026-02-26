const express = require('express');
const router  = express.Router();
const { freezeAccount, unfreezeAccount, resetBankDetails, searchEmployees } = require('../controllers/recoveryController');
const { protect, authorize } = require('../middleware/authMiddleware');

const adminOnly = authorize('admin');

router.get('/employees',               protect, adminOnly, searchEmployees);
router.post('/freeze/:employeeId',     protect, adminOnly, freezeAccount);
router.post('/unfreeze/:employeeId',   protect, adminOnly, unfreezeAccount);
router.post('/reset-bank/:employeeId', protect, adminOnly, resetBankDetails);

module.exports = router;
