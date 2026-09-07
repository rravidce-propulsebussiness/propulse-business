const express = require('express');
const controller = require('../controllers/paymentReceivingDetailsController');
const requireAuth = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');

const router = express.Router();
const writeLimit = rateLimit({ windowMs: 60 * 1000, max: 30 });
router.use(requireAuth);
router.get('/', controller.listPublic);
router.get('/admin', requireAdmin, controller.listAdmin);
router.post('/admin', requireAdmin, writeLimit, controller.create);
router.patch('/admin/:id', requireAdmin, writeLimit, controller.update);
router.delete('/admin/:id', requireAdmin, writeLimit, controller.remove);
module.exports = router;
