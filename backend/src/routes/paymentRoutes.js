const express = require('express');
const paymentController = require('../controllers/paymentController');
const razorpayMembershipController = require('../controllers/razorpayMembershipController');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

router.post('/manual', paymentController.createManualPayment);
router.get('/', paymentController.getPayments);
router.patch('/:id/status', paymentController.updatePaymentStatus);

router.get('/membership/current', razorpayMembershipController.getCurrentMembership);
router.post('/membership/order', razorpayMembershipController.createOrder);
router.post('/membership/verify', razorpayMembershipController.verifyPayment);

module.exports = router;
