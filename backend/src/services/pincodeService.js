const pool = require('../config/database');

async function searchPincodes({ query = '', stateId, limit = 50 } = {}) {
  const values = [], conditions = ['is_active=TRUE'];
  if (stateId) {
    values.push(Number(stateId));
    conditions.push(`state_id=$${values.length}`);
  }
  const q = String(query || '').trim();
  if (q) {
    values.push(`%${q.toLowerCase()}%`);
    conditions.push(`(pincode LIKE $${values.length} OR LOWER(state_name) LIKE $${values.length} OR LOWER(COALESCE(district_name,'')) LIKE $${values.length})`);
  }
  values.push(Math.min(200, Math.max(1, Number(limit) || 50)));
  return (await pool.query(
    `SELECT pincode,state_id,state_name,district_name,office_count,source,synced_at
       FROM india_pincodes
      WHERE ${conditions.join(' AND ')}
      ORDER BY pincode
      LIMIT $${values.length}`,
    values
  )).rows;
}

async function getPincode(pincode) {
  return (await pool.query(
    'SELECT pincode,state_id,state_name,district_name,office_count,source,synced_at FROM india_pincodes WHERE pincode=$1 AND is_active=TRUE',
    [String(pincode).trim()]
  )).rows[0] || null;
}

module.exports = { searchPincodes, getPincode };