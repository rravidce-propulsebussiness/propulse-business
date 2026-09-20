const express = require('express');
const requireLeadPartner = require('../middleware/leadPartnerMiddleware');
const controller = require('../controllers/leadPartnerController');
const router = express.Router();

router.post('/apply', controller.apply);
router.get('/me', controller.me);
router.get('/my-leads', controller.myLeads);
router.use(requireLeadPartner);
router.post('/leads', controller.createLead);
router.patch('/leads/:leadId/pricing', controller.updateLeadPricing);

router.get('/admin', controller.adminPartners);
router.patch('/admin/:id/status', controller.adminUpdateStatus);

module.exports = router;
