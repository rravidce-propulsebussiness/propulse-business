const express = require('express');
const customerFlowController = require('../controllers/customerFlowController');
const estimatorController = require('../controllers/estimatorController');
const requireAdmin = require('../middleware/adminMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');

const router = express.Router();
const publicReadLimit = rateLimit({ windowMs: 60 * 1000, max: 120 });
const publicSubmitLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 6 });
const publicCalculateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 30 });

router.get('/admin/leads/:leadId/attachments/:attachmentId', requireAdmin, customerFlowController.downloadReferenceAdmin);

router.get('/estimates/:publicId', publicReadLimit, estimatorController.getCalculation);
router.post('/estimates/:publicId/convert', publicSubmitLimit, estimatorController.convertCalculation);
router.get('/:key', publicReadLimit, customerFlowController.getPublic);
router.post('/:key/calculate', publicCalculateLimit, estimatorController.calculate);
router.post('/:key/consultation', publicSubmitLimit, customerFlowController.submitConsultation);
router.post('/:key/submit', publicSubmitLimit, customerFlowController.submitPublic);
router.post('/:key/:leadId/attachments', publicSubmitLimit, customerFlowController.uploadReference);
router.post('/:key/:leadId/quotation-email', publicSubmitLimit, customerFlowController.emailQuotation);

module.exports = router;
