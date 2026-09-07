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

async function resolvePincode({ stateId, cityId, district = '', location = '' } = {}) {
  const state = Number(stateId) || null;
  const city = Number(cityId) || null;
  const districtText = String(district || '').trim().toLowerCase();
  const locationText = String(location || '').trim().toLowerCase();

  if (city && locationText) {
    const exact = await pool.query(
      `SELECT DISTINCT cp.pincode, cp.office_name, c.name AS city_name, s.name AS state_name
         FROM city_pincodes cp
         JOIN cities c ON c.id=cp.city_id
         JOIN states s ON s.id=c.state_id
         LEFT JOIN subcities sc ON sc.city_id=c.id AND sc.is_active=TRUE AND sc.pincode=cp.pincode
        WHERE cp.city_id=$1
          AND cp.is_active=TRUE
          AND (LOWER(cp.office_name)=LOWER($2) OR LOWER(sc.name)=LOWER($2))
        ORDER BY cp.pincode
        LIMIT 2`,
      [city, locationText]
    );
    const unique = [...new Set(exact.rows.map(row => row.pincode).filter(Boolean))];
    if (unique.length === 1) return { pincode: unique[0], source: 'city-location', ...exact.rows[0] };
  }

  if (city) {
    const cityRows = await pool.query(
      `SELECT DISTINCT cp.pincode, cp.office_name, c.name AS city_name, s.name AS state_name
         FROM city_pincodes cp
         JOIN cities c ON c.id=cp.city_id
         JOIN states s ON s.id=c.state_id
        WHERE cp.city_id=$1 AND cp.is_active=TRUE
        ORDER BY cp.pincode
        LIMIT 2`,
      [city]
    );
    const unique = [...new Set(cityRows.rows.map(row => row.pincode).filter(Boolean))];
    if (unique.length === 1) return { pincode: unique[0], source: 'city', ...cityRows.rows[0] };
  }

  if (districtText) {
    const values = [`%${districtText}%`];
    const conditions = ['is_active=TRUE', 'LOWER(COALESCE(district_name,\'\')) LIKE $1'];
    if (state) {
      values.push(state);
      conditions.push(`state_id=$${values.length}`);
    }
    const districtRows = await pool.query(
      `SELECT DISTINCT pincode,state_id,state_name,district_name
         FROM india_pincodes
        WHERE ${conditions.join(' AND ')}
        ORDER BY pincode
        LIMIT 2`,
      values
    );
    const unique = [...new Set(districtRows.rows.map(row => row.pincode).filter(Boolean))];
    if (unique.length === 1) return { pincode: unique[0], source: 'district', ...districtRows.rows[0] };
  }

  return null;
}

module.exports = { searchPincodes, getPincode, resolvePincode };