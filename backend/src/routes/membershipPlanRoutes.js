const express = require('express');
const membershipPlanController = require('../controllers/membershipPlanController');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  return next();
}

router.get('/public', membershipPlanController.getPublicPlans);
router.get('/', requireAuth, membershipPlanController.getPlans);
router.get('/rules', requireAuth, requireAdmin, membershipPlanController.listPricingRules);
router.get('/rules/businesses', requireAuth, requireAdmin, membershipPlanController.listPricingRuleBusinesses);
router.post('/rules', requireAuth, requireAdmin, membershipPlanController.createPricingRule);
router.put('/rules/:id', requireAuth, requireAdmin, membershipPlanController.updatePricingRule);
router.delete('/rules/:id', requireAuth, requireAdmin, membershipPlanController.deletePricingRule);
router.post('/', requireAuth, requireAdmin, membershipPlanController.createPlan);
router.put('/:id', requireAuth, requireAdmin, membershipPlanController.updatePlan);
router.patch('/:id/status', requireAuth, requireAdmin, membershipPlanController.setPlanStatus);
router.delete('/:id', requireAuth, requireAdmin, membershipPlanController.deletePlan);

module.exports = router;
