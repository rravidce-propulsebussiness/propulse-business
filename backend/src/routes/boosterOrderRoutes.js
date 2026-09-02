const express = require('express');
const controller = require('../controllers/boosterOrderController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticate);
router.post('/', controller.create);
router.post('/:id/payment-reference', controller.submitPayment);
router.get('/', controller.list);

module.exports = router;
