const express = require('express');
const customerFlowController = require('../controllers/customerFlowController');
const estimatorController = require('../controllers/estimatorController');
const requireAdmin = require('../middleware/adminMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');

const router = express.Router();
const publicReadLimit = rateLimit({ windowMs: 60 * 1000, max: 120 });
const publicSubmitLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 6 });
const publicCalculateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 30 });
const adminWriteLimit = rateLimit({ windowMs: 60 * 1000, max: 60 });

router.get('/admin', requireAdmin, customerFlowController.listAdmin);
router.get('/admin/:id/estimator-config', requireAdmin, estimatorController.getAdminConfig);
router.put('/admin/:id/estimator-config', requireAdmin, adminWriteLimit, estimatorController.saveAdminConfig);
router.get('/admin/:id', requireAdmin, customerFlowController.getAdmin);
router.post('/admin', requireAdmin, adminWriteLimit, customerFlowController.create);
router.put('/admin/:id/draft', requireAdmin, adminWriteLimit, customerFlowController.saveDraft);
router.post('/admin/:id/publish', requireAdmin, adminWriteLimit, customerFlowController.publish);
router.patch('/admin/:id/status', requireAdmin, adminWriteLimit, customerFlowController.setStatus);
router.get('/admin/leads/:leadId/attachments/:attachmentId', requireAdmin, customerFlowController.downloadReferenceAdmin);

router.get('/estimates/:publicId', publicReadLimit, estimatorController.getCalculation);
router.post('/estimates/:publicId/convert', publicSubmitLimit, estimatorController.convertCalculation);
router.get('/:key', publicReadLimit, customerFlowController.getPublic);
router.post('/:key/calculate', publicCalculateLimit, estimatorController.calculate);
router.post('/:key/consultation', publicSubmitLimit, customerFlowController.submitConsultation);
router.post('/:key/submit', publicSubmitLimit, customerFlowController.submitPublic);
router.post('/:key/:leadId/attachments', publicSubmitLimit, customerFlowController.uploadReference);

module.exports = router;
