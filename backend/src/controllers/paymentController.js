const paymentService = require('../services/paymentService');
const { getMembershipAccess, getCurrentProMembership } = require('../services/membershipAccessService');

async function createManualPayment(req, res) {
  try {
    const { amount, manualReference, proofUrl, notes, membershipPlanId } = req.body;
    const payment = await paymentService.createManualPayment({ userId: req.user.id, amount, manualReference, proofUrl, notes, membershipPlanId });
    res.status(201).json(payment);
  } catch (error) {
    console.error('Create manual payment failed:', error.message);
    const status = error.code === 'DUPLICATE_REFERENCE' ? 409 : ['INVALID_PLAN','PLAN_NOT_FOUND','INVALID_AMOUNT','REFERENCE_REQUIRED','PRO_REQUIRED'].includes(error.code) ? 400 : 500;
    res.status(status).json({ error: error.message || 'Failed to create payment', code: error.code });
  }
}

async function getCurrentMembership(req, res) {
  try {
    const [membership, access] = await Promise.all([
      getCurrentProMembership(req.user.id),
      getMembershipAccess(req.user.id),
    ]);
    res.json(membership ? { ...membership, ...access } : access);
  } catch (error) {
    console.error('Get membership access failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch membership' });
  }
}

async function getPayments(req, res) {
  try {
    res.json(await paymentService.getPayments({
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    }));
  } catch (error) {
    console.error('Get payments failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
}

async function updatePaymentStatus(req, res) {
  try {
    const { status } = req.body;
    if (!['paid', 'rejected', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Only paid, rejected, or failed are valid admin review outcomes' });
    }
    const payment = await paymentService.updatePaymentStatus(req.params.id, status, req.user.id, req.body.notes);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (error) {
    console.error('Update payment failed:', error.message);
    const badRequestCodes = [
      'PAYMENT_NOT_MANUAL',
      'PAYMENT_ALREADY_PAID',
      'PAYMENT_TERMINAL',
      'INVALID_PAYMENT_TRANSITION',
      'PLAN_NOT_FOUND',
      'INVALID_PLAN',
      'PRO_REQUIRED',
    ];
    const code = error.code;
    res.status(badRequestCodes.includes(code) ? 400 : 500).json({ error: error.message || 'Failed to update payment', code });
  }
}

module.exports = { createManualPayment, getCurrentMembership, getPayments, updatePaymentStatus };