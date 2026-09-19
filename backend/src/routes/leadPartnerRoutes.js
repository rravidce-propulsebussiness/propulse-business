const express = require('express');
const controller = require('../controllers/leadPartnerController');
const requireAuth = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();

router.post('/apply', requireAuth, controller.apply);
router.get('/me', requireAuth, controller.me);
router.post('/leads', requireAuth, controller.createLead);
router.get('/leads', requireAuth, controller.myLeads);
router.patch('/leads/:leadId/pricing', requireAuth, controller.updateLeadPricing);

router.get('/admin', requireAdmin, controller.adminPartners);
router.patch('/admin/:id/status', requireAdmin, controller.adminUpdateStatus);

module.exports = router;
