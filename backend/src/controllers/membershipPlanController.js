const membershipPlanService = require('../services/membershipPlanService');

async function getPlans(req, res) {
  try { res.json(await membershipPlanService.getPlans(req.user?.role === 'admin')); }
  catch (error) { console.error('Get membership plans failed:', error.message); res.status(500).json({ error: 'Failed to fetch membership plans' }); }
}

async function createPlan(req, res) {
  try {
    const { name, description, price, durationDays = 365 } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: 'Name and price are required' });
    const plan = await membershipPlanService.createPlan({ name, description, price, durationDays });
    res.status(201).json(plan);
  } catch (error) { console.error('Create membership plan failed:', error.message); res.status(500).json({ error: 'Failed to create membership plan' }); }
}

async function updatePlan(req, res) {
  try {
    const plan = await membershipPlanService.updatePlan(req.params.id, req.body);
    if (!plan) return res.status(404).json({ error: 'Membership plan not found' });
    res.json(plan);
  } catch (error) { console.error('Update membership plan failed:', error.message); res.status(500).json({ error: 'Failed to update membership plan' }); }
}

async function setPlanStatus(req, res) {
  try {
    const plan = await membershipPlanService.setPlanStatus(req.params.id, Boolean(req.body.isActive));
    if (!plan) return res.status(404).json({ error: 'Membership plan not found' });
    res.json(plan);
  } catch (error) { console.error('Set membership plan status failed:', error.message); res.status(500).json({ error: 'Failed to update membership plan' }); }
}

async function deletePlan(req, res) {
  try {
    const plan = await membershipPlanService.deletePlan(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Membership plan not found' });
    res.json({ message: 'Membership plan deleted successfully' });
  } catch (error) { console.error('Delete membership plan failed:', error.message); res.status(500).json({ error: 'Failed to delete membership plan' }); }
}

module.exports = { getPlans, createPlan, updatePlan, setPlanStatus, deletePlan };
