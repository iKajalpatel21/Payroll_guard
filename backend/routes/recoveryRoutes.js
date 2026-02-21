const express = require('express');
const router  = express.Router();
const { freezeAccount, unfreezeAccount, resetBankDetails, searchEmployees } = require('../controllers/recoveryController');
const { protect, authorize } = require('../middleware/authMiddleware');

const staffOrAdmin = authorize('staff', 'admin');

router.get('/employees',               protect, staffOrAdmin, searchEmployees);
router.post('/freeze/:employeeId',     protect, staffOrAdmin, freezeAccount);
router.post('/unfreeze/:employeeId',   protect, staffOrAdmin, unfreezeAccount);
router.post('/reset-bank/:employeeId', protect, staffOrAdmin, resetBankDetails);

module.exports = router;
