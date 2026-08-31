const express = require('express');
const membershipPlanController = require('../controllers/membershipPlanController');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  return next();
}

router.get('/', requireAuth, membershipPlanController.getPlans);
router.post('/', requireAuth, requireAdmin, membershipPlanController.createPlan);
router.put('/:id', requireAuth, requireAdmin, membershipPlanController.updatePlan);
router.patch('/:id/status', requireAuth, requireAdmin, membershipPlanController.setPlanStatus);
router.delete('/:id', requireAuth, requireAdmin, membershipPlanController.deletePlan);

module.exports = router;
