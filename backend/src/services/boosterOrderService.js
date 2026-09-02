const pool = require('../config/database');
const { getMembershipAccess } = require('./membershipAccessService');

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
  return Number(n.toFixed(2));
}

async function createBoosterOrder(userId, data = {}) {
  const access = await getMembershipAccess(userId);
  if (!access.isPro) throw new Error('Active Pro membership is required for Booster');

  const subtotal = money(data.subtotal);
  const discount = Math.min(subtotal, money(data.discount || 0));
  const total = Number((subtotal - discount).toFixed(2));
  if (total <= 0) throw new Error('Booster order total must be greater than zero');

  const result = await pool.query(`
    INSERT INTO booster_orders(user_id,status,subtotal,discount,total,package_data,add_ons)
    VALUES($1,'pending_payment',$2,$3,$4,$5,$6)
    RETURNING *
  `, [userId, subtotal, discount, total, JSON.stringify(data.package || {}), JSON.stringify(Array.isArray(data.addOns) ? data.addOns : [])]);
  return result.rows[0];
}

async function submitPaymentReference(userId, orderId, paymentReference) {
  if (!paymentReference || !String(paymentReference).trim()) throw new Error('Payment reference is required');
  const result = await pool.query(`
    UPDATE booster_orders
    SET payment_reference=$1,status='pending_approval',updated_at=CURRENT_TIMESTAMP
    WHERE id=$2 AND user_id=$3 AND status='pending_payment'
    RETURNING *
  `, [String(paymentReference).trim(), orderId, userId]);
  if (!result.rows[0]) throw new Error('Booster order cannot accept payment reference');
  return result.rows[0];
}

async function listBoosterOrders(userId) {
  const result = await pool.query('SELECT * FROM booster_orders WHERE user_id=$1 ORDER BY created_at DESC',[userId]);
  return result.rows;
}

module.exports = { createBoosterOrder, submitPaymentReference, listBoosterOrders };