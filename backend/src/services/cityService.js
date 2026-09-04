const pool = require('../config/database');

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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

async function syncCityPincodes(cityId) {
  const cityResult = await pool.query(`SELECT c.id,c.name,s.id AS state_id,s.name AS state_name FROM cities c JOIN states s ON s.id=c.state_id WHERE c.id=$1 AND c.is_active=TRUE AND s.is_active=TRUE`, [cityId]);
  const city = cityResult.rows[0];
  if (!city) return null;

  const seen = new Set();
  let added = 0;

  const response = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(city.name)}`);
  if (response.ok) {
    const payload = await response.json();
    const offices = Array.isArray(payload?.[0]?.PostOffice) ? payload[0].PostOffice : [];
    for (const office of offices) {
      const pincode = String(office?.Pincode || office?.PINCode || '').trim();
      if (!/^\d{6}$/.test(pincode) || seen.has(pincode)) continue;
      seen.add(pincode);
      const result = await pool.query(
        `INSERT INTO city_pincodes(city_id,pincode,office_name,is_active)
         VALUES($1,$2,$3,TRUE)
         ON CONFLICT(city_id,pincode,office_name) DO UPDATE SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,
        [city.id,pincode,String(office?.Name || '').trim() || null]
      );
      if (result.rowCount) added += 1;
    }
  }

  // Reconcile against the canonical India-wide directory when it is available.
  // This catches PINs that India Post returns for the district/state but the
  // city-name lookup misses. It never invents or assigns a PIN to a sub-city.
  const directoryRows = await pool.query(
    `SELECT DISTINCT pincode
       FROM india_pincodes
      WHERE is_active=TRUE
        AND state_id=$1
        AND LOWER(COALESCE(district_name,''))=LOWER($2)`,
    [city.state_id, city.name]
  );
  for (const row of directoryRows.rows) {
    const pincode = String(row.pincode || '').trim();
    if (!/^\d{6}$/.test(pincode) || seen.has(pincode)) continue;
    seen.add(pincode);
    const result = await pool.query(
      `INSERT INTO city_pincodes(city_id,pincode,office_name,is_active)
       VALUES($1,$2,NULL,TRUE)
       ON CONFLICT(city_id,pincode,office_name) DO UPDATE SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,
      [city.id,pincode]
    );
    if (result.rowCount) added += 1;
  }

  await pool.query(`UPDATE cities SET location_sync_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [city.id]);
  return { city, totalFromProvider: seen.size, added };
}

async function createSubcity({ cityId, name, slug, pincode, source='admin' }) {
  return (await pool.query(`INSERT INTO subcities(city_id,name,slug,pincode,source) VALUES($1,$2,$3,$4,$5) RETURNING *`, [cityId,name,slug,pincode || null,source])).rows[0];
}
async function getSubcities(cityId) {
  const params=[]; const where=['sc.is_active=TRUE'];
  if (cityId) { params.push(cityId); where.push(`sc.city_id=$${params.length}`); }
  return (await pool.query(`SELECT sc.*,c.name AS city_name,s.name AS state_name FROM subcities sc JOIN cities c ON c.id=sc.city_id JOIN states s ON s.id=c.state_id WHERE ${where.join(' AND ')} ORDER BY s.name,c.name,sc.name`,params)).rows;
}
async function updateSubcity(id,{cityId,name,slug,pincode,source}) { return (await pool.query(`UPDATE subcities SET city_id=$1,name=$2,slug=$3,pincode=$4,source=COALESCE($5,source),updated_at=CURRENT_TIMESTAMP WHERE id=$6 AND is_active=TRUE RETURNING *`,[cityId,name,slug,pincode||null,source||null,id])).rows[0] || null; }
async function deactivateSubcity(id) { return (await pool.query(`UPDATE subcities SET is_active=FALSE,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND is_active=TRUE RETURNING *`,[id])).rows[0] || null; }

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
    const pincode=String(item.tags?.['addr:postcode'] || item.tags?.postcode || '').trim();
    names.set(key,{name,key,externalId:`${item.type}/${item.id}`,pincode:/^\d{6}$/.test(pincode)?pincode:null});
  }
  let added=0,restored=0,updatedPincodes=0;
  for(const item of names.values()){
    const existing=await pool.query(`SELECT id,is_active,pincode FROM subcities WHERE city_id=$1 AND slug=$2 LIMIT 1`,[city.id,item.key]);
    if(existing.rows[0]){
      if(!existing.rows[0].is_active){
        await pool.query(`UPDATE subcities SET name=$1,is_active=TRUE,source='openstreetmap',external_id=$2,pincode=COALESCE($3,pincode),updated_at=CURRENT_TIMESTAMP WHERE id=$4`,[item.name,item.externalId,item.pincode,existing.rows[0].id]);
        restored++;
      } else if(item.pincode && existing.rows[0].pincode !== item.pincode){
        await pool.query(`UPDATE subcities SET pincode=$1,source='openstreetmap',external_id=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3`,[item.pincode,item.externalId,existing.rows[0].id]);
        updatedPincodes++;
      }
    } else {
      await pool.query(`INSERT INTO subcities(city_id,name,slug,pincode,source,external_id) VALUES($1,$2,$3,$4,'openstreetmap',$5)`,[city.id,item.name,item.key,item.pincode,item.externalId]);
      added++;
    }
    if(item.pincode){
      await pool.query(`INSERT INTO city_pincodes(city_id,pincode,office_name,is_active) VALUES($1,$2,$3,TRUE) ON CONFLICT(city_id,pincode,office_name) DO UPDATE SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,[city.id,item.pincode,item.name]);
    }
  }
  return {city,totalFromProvider:names.size,added,restored,updatedPincodes};
}
async function syncPincodesBatch(limit=20) {
  const cities=(await pool.query(`SELECT id FROM cities WHERE is_active=TRUE ORDER BY location_sync_at NULLS FIRST,location_sync_at ASC,id ASC LIMIT $1`,[Math.max(1,Math.min(50,Number(limit)||20))])).rows;
  const results=[]; for(const city of cities){try{results.push({id:city.id,result:await syncCityPincodes(city.id)});}catch(error){results.push({id:city.id,error:error.message});}} return results;
}
async function syncCityCoverage(cityId) {
  const [pincodes,subcities]=await Promise.allSettled([syncCityPincodes(cityId),syncSubcitiesForCity(cityId)]);
  return {pincodes:pincodes.status==='fulfilled'?pincodes.value:null,subcities:subcities.status==='fulfilled'?subcities.value:null,errors:[pincodes,subcities].filter(x=>x.status==='rejected').map(x=>x.reason.message)};
}
async function syncCoverageBatch(limit=20) {
  const cities=(await pool.query(`SELECT id FROM cities WHERE is_active=TRUE ORDER BY location_sync_at NULLS FIRST,location_sync_at ASC,id ASC LIMIT $1`,[Math.max(1,Math.min(50,Number(limit)||20))])).rows;
  const results=[]; for(const city of cities){try{results.push({id:city.id,...(await syncCityCoverage(city.id))});}catch(error){results.push({id:city.id,error:error.message});}} return results;
}
module.exports={createCity,getCities,getCityById,updateCity,deactivateCity,syncCitiesForState,syncCityPincodes,syncPincodesBatch,createSubcity,getSubcities,updateSubcity,deactivateSubcity,syncSubcitiesForCity,syncCityCoverage,syncCoverageBatch};
