const express = require('express');
const paymentController = require('../controllers/paymentController');
const requireAuth = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();
router.use(requireAuth);
router.post('/manual', paymentController.createManualPayment);
router.get('/membership/current', paymentController.getCurrentMembership);
router.get('/', requireAdmin, paymentController.getPayments);
router.patch('/:id/status', requireAdmin, paymentController.updatePaymentStatus);
router.patch('/memberships/:id', requireAdmin, paymentController.updateMembership);
module.exports = router;
