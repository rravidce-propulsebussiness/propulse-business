const express = require('express');
const paymentController = require('../controllers/paymentController');
const requireAuth = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();
router.use(requireAuth);
router.post('/checkout/membership', paymentController.checkoutMembership);
router.post('/manual', paymentController.createManualPayment);
router.post('/:id/reference', paymentController.submitPaymentReference);
router.get('/membership/current', paymentController.getCurrentMembership);
router.get('/memberships/customers', requireAdmin, paymentController.getMembershipCustomers);
router.get('/memberships/customers/:userId', requireAdmin, paymentController.getMembershipCustomerDetails);
router.get('/', requireAdmin, paymentController.getPayments);
router.patch('/:id/status', requireAdmin, paymentController.updatePaymentStatus);
router.patch('/memberships/:id', requireAdmin, paymentController.updateMembership);
module.exports = router;
