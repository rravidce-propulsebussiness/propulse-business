const pool = require('../config/database');

const PROVIDER_DELAY_MS = 350;
let nextRequestAt = 0;
let requestQueue = Promise.resolve();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function waitForProviderSlot() {
  const run = requestQueue.then(async () => {
    const wait = Math.max(0, nextRequestAt - Date.now());
    if (wait) await sleep(wait);
    nextRequestAt = Date.now() + PROVIDER_DELAY_MS;
  });
  requestQueue = run.catch(() => {});
  return run;
}

async function syncCityPincodes(city) {
  const seen = new Set();
  let updates = 0;
  await waitForProviderSlot();
  const response = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(city.name)}`);
  if (response.ok) {
    const payload = await response.json();
    const offices = Array.isArray(payload?.[0]?.PostOffice) ? payload[0].PostOffice : [];
    for (const office of offices) {
      const pincode = String(office?.Pincode || office?.PINCode || '').trim();
      if (!/^\d{6}$/.test(pincode) || seen.has(pincode)) continue;
      seen.add(pincode);
      const officeName = String(office?.Name || '').trim() || null;
      const result = await pool.query(
        `INSERT INTO city_pincodes(city_id,pincode,office_name,is_active)
         VALUES($1,$2,$3,TRUE)
         ON CONFLICT(city_id,pincode) DO UPDATE
 SET office_name=COALESCE(EXCLUDED.office_name,city_pincodes.office_name),
     is_active=TRUE,
     updated_at=CURRENT_TIMESTAMP`,
        [city.id, pincode, officeName]
      );
      if (result.rowCount) updates += 1;
    }
  }

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
       ON CONFLICT(city_id,pincode) DO UPDATE
         SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,
      [city.id, pincode]
    );
    if (result.rowCount) updates += 1;
  }

  await pool.query(`UPDATE cities SET location_sync_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [city.id]);
  return { id: city.id, name: city.name, pincodes: seen.size, updates };
}

async function syncPincodesForState(stateId) {
  const cities = (await pool.query(
    `SELECT c.id,c.name,c.state_id
       FROM cities c
      WHERE c.state_id=$1 AND c.is_active=TRUE
      ORDER BY c.name ASC`,
    [stateId]
  )).rows;
  const results = [];
  for (const city of cities) {
    try { results.push(await syncCityPincodes(city)); }
    catch (error) { results.push({ id: city.id, name: city.name, error: error.message }); }
  }
  return results;
}

module.exports = { syncPincodesForState, syncCityPincodes };
