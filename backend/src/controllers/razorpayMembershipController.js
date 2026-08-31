const service = require('../services/razorpayMembershipService');

async function createOrder(req, res) {
  try {
    const planId = Number(req.body?.planId);
    if (!Number.isInteger(planId) || planId <= 0) return res.status(400).json({ error: 'A valid Pro plan is required' });
    res.status(201).json(await service.createMembershipOrder(req.user.id, planId));
  } catch (error) {
    console.error('Create Razorpay membership order failed:', error.message);
    const status = ['PLAN_NOT_FOUND', 'INVALID_PLAN', 'INVALID_PLAN_PRICE'].includes(error.code) ? 400
      : error.code === 'RAZORPAY_NOT_CONFIGURED' ? 503 : 500;
    res.status(status).json({ error: error.message });
  }
}

async function verifyPayment(req, res) {
  try {
    const result = await service.verifyMembershipPayment(req.user.id, req.body || {});
    res.json(result);
  } catch (error) {
    console.error('Verify Razorpay membership payment failed:', error.message);
    const status = ['INVALID_PAYMENT_DATA', 'ORDER_NOT_FOUND', 'INVALID_SIGNATURE', 'ORDER_MISMATCH', 'PAYMENT_NOT_CAPTURED'].includes(error.code) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
}

async function getCurrentMembership(req, res) {
  try { res.json(await service.getMembershipForUser(req.user.id)); }
  catch (error) { console.error('Get membership failed:', error.message); res.status(500).json({ error: 'Failed to fetch membership' }); }
}

module.exports = { createOrder, verifyPayment, getCurrentMembership };
