const express = require('express');
const paymentController = require('../controllers/paymentController');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);
router.post('/manual', paymentController.createManualPayment);
router.get('/', paymentController.getPayments);
router.patch('/:id/status', paymentController.updatePaymentStatus);

module.exports = router;
