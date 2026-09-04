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

  return result.rows[0];
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

  return result.rows[0] || null;
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

async function syncCitiesForState(stateId) {
  const stateResult = await pool.query(`SELECT id, name FROM states WHERE id = $1 AND is_active = TRUE`, [stateId]);
  const state = stateResult.rows[0];
  if (!state) return null;
  const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country: 'India', state: state.name }) });
  if (!response.ok) throw new Error(`City provider returned ${response.status}`);
  const payload = await response.json();
  if (payload.error || !Array.isArray(payload.data)) throw new Error(payload.msg || 'Could not fetch cities for this state');
  const uniqueCities = [...new Set(payload.data.map(name => String(name).trim()).filter(Boolean))];
  let added = 0, restored = 0, skipped = 0;
  for (const name of uniqueCities) {
    const slug = slugify(name);
    if (!slug) { skipped += 1; continue; }
    const existing = await pool.query(`SELECT id, is_active FROM cities WHERE state_id=$1 AND (LOWER(name)=LOWER($2) OR slug=$3) LIMIT 1`, [state.id,name,slug]);
    if (existing.rows[0]) {
      if (!existing.rows[0].is_active) { await pool.query(`UPDATE cities SET name=$1,slug=$2,is_active=TRUE,updated_at=CURRENT_TIMESTAMP WHERE id=$3`,[name,slug,existing.rows[0].id]); restored += 1; } else skipped += 1;
      continue;
    }
    await pool.query(`INSERT INTO cities(state_id,name,slug) VALUES($1,$2,$3)`,[state.id,name,slug]); added += 1;
  }
  return { state, totalFromProvider: uniqueCities.length, added, restored, skipped };
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

  if (normalizedPincode) {
    await syncCityPincodeIndex(cityId, normalizedPincode, name);
  }
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
  const cityResult = await pool.query(`SELECT c.id,c.name,s.name AS state_name FROM cities c JOIN states s ON s.id=c.state_id WHERE c.id=$1 AND c.is_active=TRUE AND s.is_active=TRUE`,[cityId]);
  const city=cityResult.rows[0]; if(!city) return null;
  const geo=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&country=India&state=${encodeURIComponent(city.state_name)}&city=${encodeURIComponent(city.name)}`,{headers:{'User-Agent':'Propulse-Business/1.0'}});
  if(!geo.ok) throw new Error(`OpenStreetMap geocoder returned ${geo.status}`);
  const points=await geo.json(); const point=points[0]; if(!point) throw new Error('City could not be geocoded');
  const query=`[out:json][timeout:25];(node[place~"^(suburb|neighbourhood|quarter)$"](around:15000,${Number(point.lat)},${Number(point.lon)});way[place~"^(suburb|neighbourhood|quarter)$"](around:15000,${Number(point.lat)},${Number(point.lon)});relation[place~="^(suburb|neighbourhood|quarter)$"](around:15000,${Number(point.lat)},${Number(point.lon)}););out center tags;`;
  const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'text/plain','User-Agent':'Propulse-Business/1.0'},body:query});
  if(!response.ok) throw new Error(`OpenStreetMap coverage provider returned ${response.status}`);
  const payload=await response.json(); const names=new Map();
  for(const item of (payload.elements||[])){
    const name=String(item.tags?.name||'').trim();
    if(!name) continue;
    const key=slugify(name);
    if(!key||names.has(key)) continue;
    names.set(key,{name,key,externalId:`${item.type}/${item.id}`});
  }
  let added=0,restored=0;
  for(const item of names.values()){
    const existing=await pool.query(`SELECT id,is_active FROM subcities WHERE city_id=$1 AND slug=$2 LIMIT 1`,[city.id,item.key]);
    if(existing.rows[0]){
      if(!existing.rows[0].is_active){
        await pool.query(`UPDATE subcities SET name=$1,is_active=TRUE,source='openstreetmap',external_id=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3`,[item.name,item.externalId,existing.rows[0].id]);
        restored++;
      }
    } else {
      await pool.query(`INSERT INTO subcities(city_id,name,slug,pincode,source,external_id) VALUES($1,$2,$3,NULL,'openstreetmap',$4)`,[city.id,item.name,item.key,item.externalId]);
      added++;
    }
  }
  return {city,totalFromProvider:names.size,added,restored};
}

async function syncCityCoverage(cityId) {
  const subcities = await syncSubcitiesForCity(cityId);
  return { subcities, errors: [] };
}

async function syncCoverageBatch(limit=20) {
  const cities=(await pool.query(`SELECT id FROM cities WHERE is_active=TRUE ORDER BY location_sync_at NULLS FIRST,location_sync_at ASC LIMIT $1`,[Math.max(1,Math.min(50,Number(limit)||20))])).rows;
  const results=[]; for(const city of cities){try{results.push({id:city.id,...(await syncCityCoverage(city.id))});}catch(error){results.push({id:city.id,error:error.message});}} return results;
}
module.exports={createCity,getCities,getCityById,updateCity,deactivateCity,syncCitiesForState,createSubcity,getSubcities,updateSubcity,deactivateSubcity,syncSubcitiesForCity,syncCityCoverage,syncCoverageBatch};
