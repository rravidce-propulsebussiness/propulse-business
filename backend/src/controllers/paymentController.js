const paymentService = require('../services/paymentService');

async function createManualPayment(req, res) {
  try {
    const { userId, amount, manualReference, proofUrl, notes } = req.body;
    if (!userId || amount === undefined || Number(amount) < 0) return res.status(400).json({ error: 'User ID and valid amount are required' });
    const payment = await paymentService.createManualPayment({ userId, amount, manualReference, proofUrl, notes });
    res.status(201).json(payment);
  } catch (error) {
    console.error('Create manual payment failed:', error.message);
    res.status(500).json({ error: 'Failed to create payment' });
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
  } catch (error) { console.error('Update payment failed:', error.message); res.status(500).json({ error: 'Failed to update payment' }); }
}

module.exports = { createManualPayment, getPayments, updatePaymentStatus };
