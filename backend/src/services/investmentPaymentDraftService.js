const crypto = require('crypto');
const pool = require('../config/database');
const { isProMember } = require('./membershipAccessService');
const { parseMoneyPaise, paiseToMoney } = require('../utils/money');

async function create({ userId, industryId, stateId, cityId, amount, reinvestmentEnabled = false }) {
  const value = paiseToMoney(parseMoneyPaise(amount));
  await require('./investmentService').validateInvestmentDraft({userId,industryId,stateId,cityId,amount:value,reinvestmentEnabled});
  const id = 'draft_' + crypto.randomBytes(18).toString('hex');
  await pool.query('DELETE FROM investment_payment_drafts WHERE expires_at < CURRENT_TIMESTAMP AND payment_id IS NULL');
  await pool.query('INSERT INTO investment_payment_drafts (id,user_id,industry_id,state_id,city_id,amount,reinvestment_enabled) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [id, userId, industryId, stateId, cityId, value, reinvestmentEnabled]);
  return id;
}

// Lock, checkout, proof and payment link commit together. Retries reuse the
// same payment, including after a restart or on another server instance.
async function submit({ id, userId, manualReference, proofUrl, notes }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const draft = (await client.query('SELECT * FROM investment_payment_drafts WHERE id=$1 AND user_id=$2 FOR UPDATE', [id, userId])).rows[0];
    if (!draft || (!draft.payment_id && new Date(draft.expires_at) <= new Date())) {
      throw Object.assign(new Error('Payment session expired. Please start the direct payment again.'), { code: 'DRAFT_NOT_FOUND' });
    }
    let paymentId = draft.payment_id;
    if (!paymentId) {
      const user = (await client.query('SELECT role,is_active FROM users WHERE id=$1 FOR SHARE', [userId])).rows[0];
      if (!user?.is_active || user.role !== 'business' || !(await isProMember(userId, client))) {
        throw Object.assign(new Error('Active Pro membership is required to invest'), { code: 'PRO_REQUIRED' });
      }
      const result = await require('./investmentService').createInvestmentCheckout({
        userId, industryId: draft.industry_id, stateId: draft.state_id,
        cityId: draft.city_id, amount: draft.amount, useWallet: false,
        reinvestmentEnabled: draft.reinvestment_enabled,
      }, client);
      paymentId = result.payment.id;
      await client.query('UPDATE investment_payment_drafts SET payment_id=$1 WHERE id=$2', [paymentId, id]);
    }
    const payment = await require('./paymentService').submitPaymentReference({
      userId, paymentId, manualReference, proofUrl, notes,
    }, client);
    await client.query('COMMIT');
    return payment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { create, submit };
