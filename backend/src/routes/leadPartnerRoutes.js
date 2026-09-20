const express = require('express');
const controller = require('../controllers/leadPartnerController');
const requireAuth = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();

function requireBusinessUser(req, res, next) {
  if (req.user?.role !== 'business') return res.status(403).json({ error: 'Lead Partner access is available only to business user accounts' });
  return next();
}

router.post('/apply', requireAuth, requireBusinessUser, controller.apply);
router.get('/me', requireAuth, requireBusinessUser, controller.me);
router.post('/leads', requireAuth, requireBusinessUser, controller.createLead);
router.get('/leads', requireAuth, requireBusinessUser, controller.myLeads);
router.patch('/leads/:leadId/pricing', requireAuth, requireBusinessUser, controller.updateLeadPricing);

router.get('/admin', requireAdmin, controller.adminPartners);
router.patch('/admin/:id/status', requireAdmin, controller.adminUpdateStatus);

module.exports = router;
