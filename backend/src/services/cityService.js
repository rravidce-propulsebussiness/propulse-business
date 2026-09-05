const pool = require('../config/database');

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizePincode(value) {
  const pincode = String(value || '').trim();
  return /^\d{6}$/.test(pincode) ? pincode : null;
}

async function syncCityPincodeIndex(cityId, pincode, officeName) {
  if (!pincode) return;
  await pool.query(
    `INSERT INTO city_pincodes(city_id,pincode,office_name,is_active)
     VALUES($1,$2,$3,TRUE)
     ON CONFLICT(city_id,pincode) DO UPDATE
       SET office_name=COALESCE(EXCLUDED.office_name,city_pincodes.office_name),
           is_active=TRUE,
           updated_at=CURRENT_TIMESTAMP`,
    [cityId, pincode, officeName || null]
  );
}

async function removeUnusedCityPincode(cityId, pincode) {
  if (!pincode) return;
  await pool.query(
    `DELETE FROM city_pincodes cp
      WHERE cp.city_id=$1
        AND cp.pincode=$2
        AND NOT EXISTS (
          SELECT 1 FROM subcities sc
           WHERE sc.city_id=cp.city_id
             AND sc.pincode=cp.pincode
             AND sc.is_active=TRUE
        )`,
    [cityId, pincode]
  );
}

async function createCity({ stateId, name, slug }) {
  const result = await pool.query(
    `INSERT INTO cities (state_id, name, slug)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [stateId, name, slug]
  );
  const city = result.rows[0];
  if (city) await pool.query('SELECT propulse_sync_city_directory_pincodes($1)', [city.id]).catch(() => {});
  return city;
}

async function getCities() {
  const result = await pool.query(
    `SELECT c.*, s.name AS state_name, s.code AS state_code,
            COALESCE((SELECT json_agg(json_build_object('id',cp.id,'pincode',cp.pincode,'officeName',cp.office_name) ORDER BY cp.pincode,cp.office_name) FROM city_pincodes cp WHERE cp.city_id=c.id AND cp.is_active=TRUE),'[]'::json) AS pincodes
     FROM cities c
     INNER JOIN states s ON s.id = c.state_id
     WHERE c.is_active = TRUE
       AND s.is_active = TRUE
     ORDER BY s.name ASC, c.name ASC`
  );
  return result.rows;
}

async function getCityById(id) {
  const result = await pool.query(
    `SELECT c.*, s.name AS state_name, s.code AS state_code,
            COALESCE((SELECT json_agg(json_build_object('id',cp.id,'pincode',cp.pincode,'officeName',cp.office_name) ORDER BY cp.pincode,cp.office_name) FROM city_pincodes cp WHERE cp.city_id=c.id AND cp.is_active=TRUE),'[]'::json) AS pincodes
     FROM cities c
     INNER JOIN states s ON s.id = c.state_id
     WHERE c.id = $1
       AND c.is_active = TRUE
       AND s.is_active = TRUE`,
    [id]
  );
  return result.rows[0] || null;
}

async function updateCity(id, { stateId, name, slug }) {
  const result = await pool.query(
    `UPDATE cities
     SET state_id = $1,
         name = $2,
         slug = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 AND is_active = TRUE
     RETURNING *`,
    [stateId, name, slug, id]
  );
  const city = result.rows[0] || null;
  if (city) await pool.query('SELECT propulse_sync_city_directory_pincodes($1)', [city.id]).catch(() => {});
  return city;
}

async function deactivateCity(id) {
  const result = await pool.query(
    `UPDATE cities
     SET is_active = FALSE,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_active = TRUE
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

async function createSubcity({ cityId, name, slug, pincode, source='admin' }) {
  const normalizedPincode = normalizePincode(pincode);
  const result = await pool.query(
    `INSERT INTO subcities(city_id,name,slug,pincode,source)
     VALUES($1,$2,$3,$4,$5)
     RETURNING *`,
    [cityId,name,slug,normalizedPincode,source]
  );
  const subcity = result.rows[0];
  if (normalizedPincode) await syncCityPincodeIndex(cityId, normalizedPincode, name);
  return subcity;
}

async function getSubcities(cityId) {
  const params=[]; const where=['sc.is_active=TRUE'];
  if (cityId) { params.push(cityId); where.push(`sc.city_id=$${params.length}`); }
  return (await pool.query(`SELECT sc.*,c.name AS city_name,s.name AS state_name FROM subcities sc JOIN cities c ON c.id=sc.city_id JOIN states s ON s.id=c.state_id WHERE ${where.join(' AND ')} ORDER BY s.name,c.name,sc.name`,params)).rows;
}

async function updateSubcity(id,{cityId,name,slug,pincode,source}) {
  const normalizedPincode = normalizePincode(pincode);
  const existing = await pool.query(`SELECT city_id,pincode FROM subcities WHERE id=$1 AND is_active=TRUE`, [id]);
  if (!existing.rows[0]) return null;

  const result = await pool.query(
    `UPDATE subcities
        SET city_id=$1,
            name=$2,
            slug=$3,
            pincode=$4,
            source=COALESCE($5,source),
            updated_at=CURRENT_TIMESTAMP
      WHERE id=$6 AND is_active=TRUE
      RETURNING *`,
    [cityId,name,slug,normalizedPincode,source || null,id]
  );
  const subcity = result.rows[0] || null;
  if (!subcity) return null;

  if (normalizedPincode) await syncCityPincodeIndex(cityId, normalizedPincode, name);
  if (existing.rows[0].pincode && (existing.rows[0].pincode !== normalizedPincode || existing.rows[0].city_id !== Number(cityId))) {
    await removeUnusedCityPincode(existing.rows[0].city_id, existing.rows[0].pincode);
  }
  return subcity;
}

async function deactivateSubcity(id) {
  const result = await pool.query(`UPDATE subcities SET is_active=FALSE,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND is_active=TRUE RETURNING *`,[id]);
  const subcity = result.rows[0] || null;
  if (subcity?.pincode) await removeUnusedCityPincode(subcity.city_id, subcity.pincode);
  return subcity;
}

async function syncSubcitiesForCity(cityId) {
  const cityResult = await pool.query(
    `SELECT c.id,c.name,c.state_id,c.is_active FROM cities c WHERE c.id=$1`,
    [cityId]
  );
  const city = cityResult.rows[0];
  if (!city) return null;
  if (!city.is_active) return { cityId: city.id, pincodeCount: 0, subcities: [] };

  const synced = await pool.query('SELECT propulse_sync_city_directory_pincodes($1) AS count', [city.id]);
  const subcities = await pool.query(
    `SELECT sc.*,c.name AS city_name,s.name AS state_name
       FROM subcities sc
       JOIN cities c ON c.id=sc.city_id
       JOIN states s ON s.id=c.state_id
      WHERE sc.city_id=$1 AND sc.is_active=TRUE
      ORDER BY sc.name`,
    [city.id]
  );
  const pincodes = await pool.query(
    `SELECT id,pincode,office_name AS "officeName",source
       FROM city_pincodes
      WHERE city_id=$1 AND is_active=TRUE
      ORDER BY pincode,office_name`,
    [city.id]
  );
  return {
    cityId: city.id,
    cityName: city.name,
    pincodeCount: pincodes.rows.length,
    directorySyncCount: Number(synced.rows[0]?.count || 0),
    pincodes: pincodes.rows,
    subcities: subcities.rows
  };
}

module.exports={createCity,getCities,getCityById,updateCity,deactivateCity,createSubcity,getSubcities,updateSubcity,deactivateSubcity,syncSubcitiesForCity};
