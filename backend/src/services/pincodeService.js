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

async function fetchPostalPincode(pincode) {
  const value = String(pincode || '').trim();
  if (!/^\d{6}$/.test(value)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${value}`, { signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json();
    const offices = payload?.[0]?.Status === 'Success' && Array.isArray(payload?.[0]?.PostOffice)
      ? payload[0].PostOffice
      : [];
    const first = offices[0];
    if (!first) return null;
    return {
      pincode: value,
      state_id: null,
      state_name: String(first.State || '').trim(),
      district_name: String(first.District || first.Block || '').trim(),
      office_name: String(first.Name || '').trim(),
      city_name: String(first.District || first.Block || first.Name || '').trim(),
      // A PIN can serve several post offices. Keep all office names so the
      // importer can match a Propulse city such as Patancheru even when the
      // API's first record reports a postal district instead.
      office_names: offices.map(x => String(x?.Name || '').trim()).filter(Boolean),
      office_count: offices.length,
      source: 'postalpincode-api',
      synced_at: new Date(),
    };
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getPincode(pincode) {
  const value = String(pincode).trim();
  const local = (await pool.query(
    'SELECT pincode,state_id,state_name,district_name,office_count,source,synced_at FROM india_pincodes WHERE pincode=$1 AND is_active=TRUE',
    [value]
  )).rows[0];
  if (local) return local;

  // Keep the Lead Partner importer consistent with the Admin lead uploader,
  // which detects the location from the same public India PIN lookup API.
  const external = await fetchPostalPincode(value);
  if (!external) return null;

  // Cache the successful lookup so repeated sheet syncs do not need an API call.
  try {
    await pool.query(
      `INSERT INTO india_pincodes(pincode,state_id,state_name,district_name,office_count,source,synced_at,is_active)
       VALUES($1,NULL,$2,$3,$4,$5,CURRENT_TIMESTAMP,TRUE)
       ON CONFLICT(pincode) DO UPDATE SET
         state_name=EXCLUDED.state_name,
         district_name=EXCLUDED.district_name,
         office_count=EXCLUDED.office_count,
         source=EXCLUDED.source,
         synced_at=CURRENT_TIMESTAMP,
         is_active=TRUE`,
      [external.pincode, external.state_name, external.district_name, external.office_count, external.source]
    );
  } catch (_) {
    // Lookup is still valid even if the optional cache write cannot be completed.
  }
  return external;
}

async function resolvePincode({ stateId, cityId, district = '', location = '' } = {}) {
  const state = Number(stateId) || null;
  const city = Number(cityId) || null;
  const districtText = String(district || '').trim().toLowerCase();
  const locationText = String(location || '').trim().toLowerCase();

  if (locationText) {
    const values = [locationText];
    const conditions = [
      'cp.is_active=TRUE',
      '(LOWER(c.name)=LOWER($1) OR LOWER(COALESCE(cp.office_name,\'\'))=LOWER($1) OR LOWER(COALESCE(sc.name,\'\'))=LOWER($1))',
    ];
    if (state) {
      values.push(state);
      conditions.push(`c.state_id=$${values.length}`);
    }
    const locationRows = await pool.query(
      `SELECT DISTINCT cp.pincode, cp.office_name, c.name AS city_name, s.name AS state_name
         FROM city_pincodes cp
         JOIN cities c ON c.id=cp.city_id
         JOIN states s ON s.id=c.state_id
         LEFT JOIN subcities sc ON sc.city_id=c.id AND sc.is_active=TRUE AND sc.pincode=cp.pincode
        WHERE ${conditions.join(' AND ')}
        ORDER BY cp.pincode
        LIMIT 2`,
      values
    );
    const unique = [...new Set(locationRows.rows.map(row => row.pincode).filter(Boolean))];
    if (unique.length === 1) return { pincode: unique[0], source: 'location', ...locationRows.rows[0] };
  }

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