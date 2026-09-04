const pool = require('../config/database');

const PROVIDER = 'https://api.pincodeapi.in/api/v1';
const PROVIDER_DELAY_MS = 1800;
let nextProviderRequestAt = 0;
let providerQueue = Promise.resolve();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function waitForProviderSlot() {
  const run = providerQueue.then(async () => {
    const wait = Math.max(0, nextProviderRequestAt - Date.now());
    if (wait) await sleep(wait);
    nextProviderRequestAt = Date.now() + PROVIDER_DELAY_MS;
  });
  providerQueue = run.catch(() => {});
  return run;
}

function normalizeOfficeRows(payload) {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.post_offices)) return data.post_offices;
  return [];
}
function officePincode(row) { return String(row?.pincode ?? row?.PINCode ?? row?.Pincode ?? '').trim(); }
function officeState(row) { return String(row?.statename ?? row?.state ?? row?.State ?? '').trim(); }
function officeDistrict(row) { return String(row?.district ?? row?.District ?? '').trim() || null; }

async function upsertPincodes(rows, stateId, stateName) {
  const byPincode = new Map();
  for (const row of rows) {
    const pincode = officePincode(row);
    if (!/^\d{6}$/.test(pincode)) continue;
    const existing = byPincode.get(pincode);
    if (!existing) byPincode.set(pincode, { stateName: officeState(row) || stateName, district: officeDistrict(row), offices: 1 });
    else existing.offices += 1;
  }
  if (!byPincode.size) return { uniquePincodes: 0, upserted: 0 };

  const entries = [...byPincode.entries()];
  const values = [];
  const placeholders = entries.map(([pincode, item], index) => {
    const offset = index * 5;
    values.push(pincode, stateId || null, item.stateName, item.district, item.offices);
    return `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},'pincodeapi-india-post',TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`;
  });
  const result = await pool.query(
    `INSERT INTO india_pincodes (pincode,state_id,state_name,district_name,office_count,source,is_active,synced_at,updated_at)
     VALUES ${placeholders.join(',')}
     ON CONFLICT (pincode) DO UPDATE SET state_id=COALESCE(EXCLUDED.state_id,india_pincodes.state_id),state_name=EXCLUDED.state_name,district_name=EXCLUDED.district_name,office_count=EXCLUDED.office_count,source=EXCLUDED.source,is_active=TRUE,synced_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`,
    values
  );
  return { uniquePincodes: byPincode.size, upserted: result.rowCount };
}

async function fetchProviderPage(stateName, page, limit) {
  await waitForProviderSlot();
  const response = await fetch(`${PROVIDER}/state/${encodeURIComponent(stateName)}?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error(`Pincode provider returned ${response.status}`);
  const payload = await response.json();
  if (payload?.success === false || payload?.status === 'error') throw new Error(payload?.error?.message || 'Pincode provider returned an error');
  return normalizeOfficeRows(payload);
}

async function syncPincodesForState(stateId) {
  const stateResult = await pool.query('SELECT id,name FROM states WHERE id=$1 AND is_active=TRUE', [stateId]);
  const state = stateResult.rows[0];
  if (!state) return null;
  let page = 1, totalOffices = 0, totalPincodes = 0;
  const limit = 500;
  while (true) {
    const rows = await fetchProviderPage(state.name, page, limit);
    if (!rows.length) break;
    totalOffices += rows.length;
    const result = await upsertPincodes(rows, state.id, state.name);
    totalPincodes += result.uniquePincodes;
    if (rows.length < limit) break;
    page += 1;
  }
  return { state, pages: page, totalOffices, totalPincodes };
}

async function syncAllIndiaPincodes() {
  const states = (await pool.query('SELECT id,name FROM states WHERE is_active=TRUE ORDER BY id')).rows;
  const results = [];
  const concurrency = 4;
  for (let start = 0; start < states.length; start += concurrency) {
    const batch = states.slice(start, start + concurrency);
    results.push(...await Promise.all(batch.map(async state => {
      try { return { id: state.id, name: state.name, result: await syncPincodesForState(state.id) }; }
      catch (error) { return { id: state.id, name: state.name, error: error.message }; }
    })));
  }
  const count = await pool.query('SELECT COUNT(*)::int AS count FROM india_pincodes WHERE is_active=TRUE');
  return { states: results, totalPincodes: Number(count.rows[0]?.count || 0) };
}

async function searchPincodes({ query = '', stateId, limit = 50 } = {}) {
  const values = [], conditions = ['is_active=TRUE'];
  if (stateId) { values.push(Number(stateId)); conditions.push(`state_id=$${values.length}`); }
  const q = String(query || '').trim();
  if (q) { values.push(`%${q.toLowerCase()}%`); conditions.push(`(pincode LIKE $${values.length} OR LOWER(state_name) LIKE $${values.length} OR LOWER(COALESCE(district_name,'')) LIKE $${values.length})`); }
  values.push(Math.min(200, Math.max(1, Number(limit) || 50)));
  return (await pool.query(`SELECT pincode,state_id,state_name,district_name,office_count,source,synced_at FROM india_pincodes WHERE ${conditions.join(' AND ')} ORDER BY pincode LIMIT $${values.length}`, values)).rows;
}
async function getPincode(pincode) { return (await pool.query('SELECT pincode,state_id,state_name,district_name,office_count,source,synced_at FROM india_pincodes WHERE pincode=$1 AND is_active=TRUE', [String(pincode).trim()])).rows[0] || null; }
module.exports = { syncPincodesForState, syncAllIndiaPincodes, searchPincodes, getPincode };