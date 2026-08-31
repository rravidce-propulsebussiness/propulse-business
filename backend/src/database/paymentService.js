const pool = require('../config/database');

async function getPayments({ status = 'all', method = 'all', search = '' } = {}) {
  const params = [];
  const conditions = ['1=1'];

  if (status !== 'all') {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }
  if (method !== 'all') {
    params.push(method);
    conditions.push(`p.method = $${params.length}`);
  }
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR bp.business_name ILIKE $${params.length} OR p.reference_number ILIKE $${params.length})`);
  }

  const result = await pool.query(`
    SELECT p.id, p.user_id, u.name AS user_name, u.email, bp.business_name,
           p.amount, p.currency, p.method, p.gateway, p.reference_number,
           p.status, p.proof_url, p.notes, p.paid_at, p.reviewed_at, p.created_at,
           mp.name AS membership_plan
    FROM payments p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    LEFT JOIN membership_plans mp ON mp.id = p.membership_plan_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.created_at DESC
  `, params);

  return result.rows;
}

async function reviewManualPayment(id, { status, notes, reviewedBy }) {
  if (!['paid', 'rejected'].includes(status)) throw new Error('Invalid payment review status');
  const result = await pool.query(`
    UPDATE payments
    SET status = $1,
        notes = COALESCE($2, notes),
        reviewed_by = $3,
        reviewed_at = CURRENT_TIMESTAMP,
        paid_at = CASE WHEN $1 = 'paid' THEN COALESCE(paid_at, CURRENT_TIMESTAMP) ELSE paid_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4 AND method = 'manual'
    RETURNING *
  `, [status, notes || null, reviewedBy, id]);
  return result.rows[0] || null;
}

module.exports = { getPayments, reviewManualPayment };
