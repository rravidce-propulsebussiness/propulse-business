const pool = require('../config/database');

const PROVIDER = 'https://api.pincodeapi.in/api/v1';
const PROVIDER_DELAY_MS = 1800;
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

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function officePincode(row) {
  return String(row?.pincode ?? row?.PINCode ?? row?.Pincode ?? '').trim();
}

function officeName(row) {
  return String(row?.office_name ?? row?.officename ?? row?.Name ?? '').trim();
}

function officeState(row) {
  return String(row?.state ?? row?.statename ?? row?.State ?? '').trim();
}

function isCityOfficeMatch(office, city) {
  const cityName = normalize(city.name);
  const name = normalize(officeName(office));
  if (!cityName || !name) return false;

  return name === cityName ||
    name.startsWith(`${cityName} `) ||
    name.includes(` ${cityName} `) ||
    name.endsWith(` ${cityName}`);
}

async function searchCityPostOffices(city) {
  await waitForProviderSlot();
  const response = await fetch(`${PROVIDER}/search?q=${encodeURIComponent(city.name)}&limit=50&offset=0`);
  if (!response.ok) throw new Error(`Pincode provider returned ${response.status}`);

  const payload = await response.json();
  if (payload?.success === false || payload?.status === 'error') {
    throw new Error(payload?.error?.message || 'Pincode provider returned an error');
  }

  const rows = Array.isArray(payload?.data?.post_offices)
    ? payload.data.post_offices
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  return rows.filter(row => {
    const state = normalize(officeState(row));
    const cityState = normalize(city.state_name);
    return (!state || !cityState || state === cityState) && isCityOfficeMatch(row, city);
  });
}

async function upsertCityPincodes(city, offices) {
  const seen = new Set();
  let updates = 0;

  for (const office of offices) {
    const pincode = officePincode(office);
    if (!/^\d{6}$/.test(pincode) || seen.has(pincode)) continue;
    seen.add(pincode);

    const name = officeName(office) || null;
    const result = await pool.query(
      `INSERT INTO city_pincodes(city_id,pincode,office_name,is_active)
       VALUES($1,$2,$3,TRUE)
       ON CONFLICT(city_id,pincode) DO UPDATE
         SET office_name=COALESCE(EXCLUDED.office_name,city_pincodes.office_name),
             is_active=TRUE,
             updated_at=CURRENT_TIMESTAMP`,
      [city.id, pincode, name]
    );
    if (result.rowCount) updates += 1;
  }

  // The Admin screen also displays subcities. When a postal office name
  // corresponds to an existing subcity (for example Kukatpally S.O.), carry
  // the verified PIN into that subcity without another API call.
  await pool.query(
    `UPDATE subcities sc
        SET pincode=cp.pincode,
            source=COALESCE(NULLIF(cp.source,''),'india-post-open-api'),
            updated_at=CURRENT_TIMESTAMP
       FROM city_pincodes cp
      WHERE cp.city_id=$1
        AND cp.is_active=TRUE
        AND sc.city_id=cp.city_id
        AND sc.is_active=TRUE
        AND (
          LOWER(REGEXP_REPLACE(sc.name,'[^a-zA-Z0-9]+','','g')) =
            LOWER(REGEXP_REPLACE(COALESCE(cp.office_name,''),'[^a-zA-Z0-9]+','','g'))
          OR LOWER(REGEXP_REPLACE(COALESCE(cp.office_name,''),'[^a-zA-Z0-9]+','','g')) LIKE
            '%' || LOWER(REGEXP_REPLACE(sc.name,'[^a-zA-Z0-9]+','','g')) || '%'
        )`,
    [city.id]
  );

  return { pincodes: seen, updates };
}

async function syncCityPincodes(city) {
  const offices = await searchCityPostOffices(city);
  const result = await upsertCityPincodes(city, offices);

  if (!result.pincodes.size) {
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
      if (!/^\d{6}$/.test(pincode) || result.pincodes.has(pincode)) continue;
      result.pincodes.add(pincode);
      const insertResult = await pool.query(
        `INSERT INTO city_pincodes(city_id,pincode,office_name,is_active)
         VALUES($1,$2,NULL,TRUE)
         ON CONFLICT(city_id,pincode) DO UPDATE
           SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,
        [city.id, pincode]
      );
      if (insertResult.rowCount) result.updates += 1;
    }
  }

  await pool.query(
    `UPDATE cities
        SET location_sync_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
      WHERE id=$1`,
    [city.id]
  );

  return { id: city.id, name: city.name, pincodes: result.pincodes.size, updates: result.updates };
}

async function syncPincodesForState(stateId) {
  const cities = (await pool.query(
    `SELECT c.id,c.name,c.state_id,s.name AS state_name
       FROM cities c
       JOIN states s ON s.id=c.state_id
      WHERE c.state_id=$1 AND c.is_active=TRUE AND s.is_active=TRUE
      ORDER BY c.name ASC`,
    [stateId]
  )).rows;

  const results = [];
  for (const city of cities) {
    try {
      results.push(await syncCityPincodes(city));
    } catch (error) {
      results.push({ id: city.id, name: city.name, error: error.message });
    }
  }
  return results;
}

module.exports = { syncPincodesForState, syncCityPincodes };
