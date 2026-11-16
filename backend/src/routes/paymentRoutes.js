const express = require('express');
const paymentController = require('../controllers/paymentController');
const requireAuth = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');
const idempotency = require('../middleware/idempotencyMiddleware');

const router = express.Router();
const NUMERIC_PAYMENT_ID = /^[1-9]\d{0,9}$/;
const INVESTMENT_DRAFT_ID = /^draft_[a-f0-9]{36}$/;
require('../utils/numericRouteParams').numericRouteParams(router,'id','userId');
const paymentWriteLimit = rateLimit({ windowMs: 60 * 1000, max: 20 });
const adminPaymentWriteLimit = rateLimit({ windowMs: 60 * 1000, max: 60 });
router.use(requireAuth);
router.post('/checkout/membership', paymentWriteLimit, idempotency('membership.checkout'), paymentController.checkoutMembership);
router.get('/gateways', paymentController.getGateways);
router.post('/gateway-order', paymentWriteLimit, idempotency('payment.gateway_order'), paymentController.createGatewayOrder);
router.post('/:id/gateway-confirm', paymentWriteLimit, idempotency('payment.gateway_confirm'), paymentController.confirmGatewayPayment);
router.post('/:referenceId/reference', paymentWriteLimit, (req, res, next) => {
  const id = String(req.params.referenceId || '');
  if (!NUMERIC_PAYMENT_ID.test(id) && !INVESTMENT_DRAFT_ID.test(id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  return next();
}, paymentController.submitPaymentReference);
router.get('/membership/current', paymentController.getCurrentMembership);
router.get('/membership/history', paymentController.getUserMembershipPayments);
router.get('/memberships/customers', requireAdmin, paymentController.getMembershipCustomers);
router.get('/memberships/customers/:userId', requireAdmin, paymentController.getMembershipCustomerDetails);
router.get('/', requireAdmin, paymentController.getPayments);
router.get('/:id/proof', requireAdmin, paymentController.getPaymentProof);
router.get('/:id/proof/file', requireAdmin, paymentController.streamPaymentProof);
router.patch('/:id/status', requireAdmin, adminPaymentWriteLimit, paymentController.updatePaymentStatus);
router.patch('/memberships/:id', requireAdmin, adminPaymentWriteLimit, paymentController.updateMembership);
module.exports = router;
