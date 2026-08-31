const pool = require('../config/database');

async function createManualPayment({ userId, amount, manualReference, proofUrl, notes }) {
  const result = await pool.query(
    `INSERT INTO payments (user_id, amount, payment_method, manual_reference, proof_url, notes)
     VALUES ($1, $2, 'manual', $3, $4, $5) RETURNING *`,
    [userId, amount, manualReference || null, proofUrl || null, notes || null]
  );
  return result.rows[0];
}

async function getPayments({ status, search }) {
  const values = [];
  const where = [];
  if (status && status !== 'all') { values.push(status); where.push(`p.status = $${values.length}`); }
  if (search) {
    values.push(`%${search}%`);
    where.push(`(u.name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR COALESCE(p.manual_reference,'') ILIKE $${values.length})`);
  }
  const result = await pool.query(
    `SELECT p.*, u.name AS user_name, u.email AS user_email, bp.business_name
     FROM payments p JOIN users u ON u.id = p.user_id
     LEFT JOIN business_profiles bp ON bp.user_id = u.id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY p.created_at DESC`, values
  );
  return result.rows;
}

async function updatePaymentStatus(id, status, adminId, notes) {
  const result = await pool.query(
    `UPDATE payments SET status=$1, verified_by=$2, verified_at=CURRENT_TIMESTAMP, notes=COALESCE($3, notes), updated_at=CURRENT_TIMESTAMP
     WHERE id=$4 RETURNING *`, [status, adminId, notes || null, id]
  );
  return result.rows[0] || null;
}

module.exports = { createManualPayment, getPayments, updatePaymentStatus };
