const express = require('express');
const membershipPlanController = require('../controllers/membershipPlanController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/', requireAuth, membershipPlanController.getPlans);
router.post('/', requireAuth, requireAdmin, membershipPlanController.createPlan);
router.put('/:id', requireAuth, requireAdmin, membershipPlanController.updatePlan);
router.patch('/:id/status', requireAuth, requireAdmin, membershipPlanController.setPlanStatus);
router.delete('/:id', requireAuth, requireAdmin, membershipPlanController.deletePlan);

module.exports = router;
