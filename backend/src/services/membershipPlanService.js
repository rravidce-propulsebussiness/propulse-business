const pool = require('../config/database');

function calculatePrice(monthlyBasePrice, billingPeriod, discountPercent = 0) {
  const months = billingPeriod === 'quarterly' ? 3 : billingPeriod === 'yearly' ? 12 : 1;
  const base = Number(monthlyBasePrice);
  const discount = Number(discountPercent) || 0;
  return Number((base * months * (1 - discount / 100)).toFixed(2));
}

async function getPlans(includeInactive = true) {
  const result = await pool.query(
    `SELECT id, name, plan_type, description, price, duration_days, billing_period,
            monthly_base_price, discount_percent, is_active, created_at, updated_at
     FROM membership_plans ${includeInactive ? '' : 'WHERE is_active = TRUE'}
     ORDER BY plan_type ASC, CASE billing_period WHEN 'monthly' THEN 1 WHEN 'quarterly' THEN 2 ELSE 3 END, price ASC, id ASC`
  );
  return result.rows;
}

async function createPlan({ name, planType = 'non_pro', description, price, durationDays, billingPeriod = 'yearly', monthlyBasePrice, discountPercent = 0 }) {
  const base = monthlyBasePrice === undefined || monthlyBasePrice === '' ? Number(price || 0) : Number(monthlyBasePrice);
  const months = billingPeriod === 'quarterly' ? 3 : billingPeriod === 'yearly' ? 12 : 1;
  const finalPrice = calculatePrice(base, billingPeriod, discountPercent);
  const days = durationDays || (billingPeriod === 'monthly' ? 30 : billingPeriod === 'quarterly' ? 90 : 365);
  const result = await pool.query(
    `INSERT INTO membership_plans (name, plan_type, description, price, duration_days, billing_period, monthly_base_price, discount_percent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [name, planType, description || null, finalPrice, days, billingPeriod, base, Number(discountPercent) || 0]
  );
  return result.rows[0];
}

async function updatePlan(id, { name, planType = 'non_pro', description, price, durationDays, billingPeriod = 'yearly', monthlyBasePrice, discountPercent = 0 }) {
  const current = await pool.query('SELECT * FROM membership_plans WHERE id=$1', [id]);
  if (!current.rows[0]) return null;
  const base = monthlyBasePrice === undefined || monthlyBasePrice === '' ? Number(price || current.rows[0].price) : Number(monthlyBasePrice);
  const finalPrice = calculatePrice(base, billingPeriod, discountPercent);
  const days = durationDays || (billingPeriod === 'monthly' ? 30 : billingPeriod === 'quarterly' ? 90 : 365);
  const result = await pool.query(
    `UPDATE membership_plans SET name=$1, plan_type=$2, description=$3, price=$4, duration_days=$5,
     billing_period=$6, monthly_base_price=$7, discount_percent=$8, updated_at=CURRENT_TIMESTAMP
     WHERE id=$9 RETURNING *`,
    [name, planType, description || null, finalPrice, days, billingPeriod, base, Number(discountPercent) || 0, id]
  );
  return result.rows[0] || null;
}

async function setPlanStatus(id, isActive) {
  const result = await pool.query(`UPDATE membership_plans SET is_active=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`, [isActive, id]);
  return result.rows[0] || null;
}
async function deletePlan(id) {
  const result = await pool.query('DELETE FROM membership_plans WHERE id=$1 RETURNING id', [id]);
  return result.rows[0] || null;
}
module.exports = { getPlans, createPlan, updatePlan, setPlanStatus, deletePlan, calculatePrice };
