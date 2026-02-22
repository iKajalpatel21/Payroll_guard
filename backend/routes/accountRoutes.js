const express = require('express');
const router  = express.Router();
const { getProfile, updateAddress, getActivity, setBaseline } = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

router.get('/profile',  protect, getProfile);
router.put('/address',  protect, updateAddress);
router.get('/activity', protect, getActivity);
router.post('/baseline', protect, setBaseline);

module.exports = router;
