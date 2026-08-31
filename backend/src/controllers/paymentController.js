const paymentService = require('../services/paymentService');

async function createManualPayment(req, res) {
  try {
    const { amount, manualReference, proofUrl, notes, membershipPlanId } = req.body;
    const payment = await paymentService.createManualPayment({ userId: req.user.id, amount, manualReference, proofUrl, notes, membershipPlanId });
    res.status(201).json(payment);
  } catch (error) {
    console.error('Create manual payment failed:', error.message);
    const status = ['INVALID_PLAN','PLAN_NOT_FOUND','INVALID_AMOUNT','REFERENCE_REQUIRED'].includes(error.code) ? 400 : 500;
    res.status(status).json({ error: error.message || 'Failed to create payment' });
  }
}

async function getPayments(req, res) {
  try { res.json(await paymentService.getPayments({ status: req.query.status, search: req.query.search })); }
  catch (error) { console.error('Get payments failed:', error.message); res.status(500).json({ error: 'Failed to fetch payments' }); }
}

async function updatePaymentStatus(req, res) {
  try {
    const { status } = req.body;
    if (!['paid', 'rejected', 'failed', 'refunded'].includes(status)) return res.status(400).json({ error: 'Invalid payment status' });
    const payment = await paymentService.updatePaymentStatus(req.params.id, status, req.user.id, req.body.notes);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (error) {
    console.error('Update payment failed:', error.message);
    const code = error.code === 'PAYMENT_NOT_MANUAL' || error.code === 'PLAN_NOT_FOUND' || error.code === 'INVALID_PLAN' ? 400 : 500;
    res.status(code).json({ error: error.message || 'Failed to update payment' });
  }
}

module.exports = { createManualPayment, getPayments, updatePaymentStatus };