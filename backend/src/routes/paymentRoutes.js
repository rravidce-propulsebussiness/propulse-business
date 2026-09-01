const express = require('express');
const paymentController = require('../controllers/paymentController');
const razorpayMembershipController = require('../controllers/razorpayMembershipController');
const requireAuth = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();

router.use(requireAuth);

// Customer payment operations.
router.post('/manual', paymentController.createManualPayment);
router.get('/membership/current', razorpayMembershipController.getCurrentMembership);
router.post('/membership/order', razorpayMembershipController.createOrder);
router.post('/membership/verify', razorpayMembershipController.verifyPayment);

// Administrative payment operations must never be accessible to normal businesses.
router.get('/', requireAdmin, paymentController.getPayments);
router.patch('/:id/status', requireAdmin, paymentController.updatePaymentStatus);

module.exports = router;
