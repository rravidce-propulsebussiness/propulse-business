const express = require('express');
const customerFlowController = require('../controllers/customerFlowController');
const requireAdmin = require('../middleware/adminMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');

const router = express.Router();
const publicReadLimit = rateLimit({ windowMs: 60 * 1000, max: 120 });
const publicSubmitLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 6 });
const adminWriteLimit = rateLimit({ windowMs: 60 * 1000, max: 60 });

router.get('/admin', requireAdmin, customerFlowController.listAdmin);
router.get('/admin/:id', requireAdmin, customerFlowController.getAdmin);
router.post('/admin', requireAdmin, adminWriteLimit, customerFlowController.create);
router.put('/admin/:id/draft', requireAdmin, adminWriteLimit, customerFlowController.saveDraft);
router.post('/admin/:id/publish', requireAdmin, adminWriteLimit, customerFlowController.publish);
router.patch('/admin/:id/status', requireAdmin, adminWriteLimit, customerFlowController.setStatus);

router.get('/:key', publicReadLimit, customerFlowController.getPublic);
router.post('/:key/submit', publicSubmitLimit, customerFlowController.submitPublic);

module.exports = router;
