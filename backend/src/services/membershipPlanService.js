const pool = require('../config/database');

async function getPlans(includeInactive = true) {
  const result = await pool.query(
    `SELECT id, name, description, price, duration_days, is_active, created_at, updated_at
     FROM membership_plans ${includeInactive ? '' : 'WHERE is_active = TRUE'} ORDER BY price ASC, id ASC`
  );
  return result.rows;
}

async function createPlan({ name, description, price, durationDays = 365 }) {
  const result = await pool.query(
    `INSERT INTO membership_plans (name, description, price, duration_days)
     VALUES ($1,$2,$3,$4) RETURNING *`, [name, description || null, price, durationDays]
  );
  return result.rows[0];
}

async function updatePlan(id, { name, description, price, durationDays }) {
  const result = await pool.query(
    `UPDATE membership_plans SET name=$1, description=$2, price=$3, duration_days=$4, updated_at=CURRENT_TIMESTAMP
     WHERE id=$5 RETURNING *`, [name, description || null, price, durationDays, id]
  );
  return result.rows[0] || null;
}

async function setPlanStatus(id, isActive) {
  const result = await pool.query(
    `UPDATE membership_plans SET is_active=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`, [isActive, id]
  );
  return result.rows[0] || null;
}

async function deletePlan(id) {
  const result = await pool.query('DELETE FROM membership_plans WHERE id=$1 RETURNING id', [id]);
  return result.rows[0] || null;
}

module.exports = { getPlans, createPlan, updatePlan, setPlanStatus, deletePlan };
