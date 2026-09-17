const pool = require('../config/database');
const leadService = require('./leadService');
const partnerPricing = require('./leadPartnerPricingService');
const { fetchGoogleSheetCsv } = require('./googleSheetService');
const { resolvePincode } = require('./pincodeService');

const clean = v => String(v ?? '').trim();
const norm = v => clean(v).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
const aliases = {
  id: 'id', leadid: 'id', lead_id: 'id', externalid: 'id', external_id: 'id',
  industry: 'industry', industryname: 'industry', service: 'service', servicename: 'service',
  subservice: 'subservice', subservicename: 'subservice', state: 'state', city: 'city',
  pincode: 'pincode', pin: 'pincode', zipcode: 'pincode', postalcode: 'pincode',
  customername: 'customerName', name: 'customerName', customer: 'customerName',
  customerphone: 'customerPhone', phone: 'customerPhone', mobile: 'customerPhone',
  customeremail: 'customerEmail', email: 'customerEmail',
  requirement: 'requirement', requirements: 'requirement', requirementdetails: 'requirement',
  propertytype: 'propertyType', budget: 'budget', source: 'source', notes: 'notes',
  buyercapacity: 'buyerCapacity', maxbuyers: 'buyerCapacity', capacity: 'buyerCapacity',
  leadtype: 'leadType', exclusive: 'isExclusive', isexclusive: 'isExclusive',
};

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i += 1; row.push(cell); if (row.some(v => clean(v))) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  row.push(cell); if (row.some(v => clean(v))) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map(h => aliases[norm(h)] || clean(h));
  return rows.slice(1).map(source => Object.fromEntries(headers.map((h, i) => [h, clean(source[i])])))
    .filter(row => Object.values(row).some(Boolean));
}

async function catalogs() {
  const [industries, services, subservices, states, cities] = await Promise.all([
    pool.query('SELECT id,name,slug FROM industries WHERE is_active=TRUE'),
    pool.query('SELECT id,name,slug,industry_id FROM services WHERE is_active=TRUE'),
    pool.query('SELECT id,name,slug,service_id FROM subservices WHERE is_active=TRUE'),
    pool.query('SELECT id,name,code FROM states WHERE is_active=TRUE'),
    pool.query('SELECT id,name,slug,state_id FROM cities WHERE is_active=TRUE'),
  ]);
  return { industries: industries.rows, services: services.rows, subservices: subservices.rows, states: states.rows, cities: cities.rows };
}

const findByName = (items, name) => {
  const wanted = norm(name); return wanted ? items.find(x => norm(x.name) === wanted) || null : null;
};

async function buildLead(row, cat) {
  const industry = findByName(cat.industries, row.industry);
  const service = industry ? cat.services.find(x => Number(x.industry_id) === Number(industry.id) && norm(x.name) === norm(row.service)) : findByName(cat.services, row.service);
  const subservice = service ? cat.subservices.find(x => Number(x.service_id) === Number(service.id) && norm(x.name) === norm(row.subservice)) : null;
  const state = findByName(cat.states, row.state);
  const city = state ? cat.cities.find(x => Number(x.state_id) === Number(state.id) && norm(x.name) === norm(row.city)) : findByName(cat.cities, row.city);
  if (!industry) throw new Error('Industry could not be resolved');
  if (!service) throw new Error('Service could not be resolved');
  if (!state) throw new Error('State could not be resolved');
  if (!city) throw new Error('City could not be resolved');
  let pincode = clean(row.pincode).replace(/\D/g, '');
  if (!/^\d{6}$/.test(pincode)) {
    const resolved = await resolvePincode({ stateId: state.id, cityId: city.id, location: row.city, district: row.city });
    pincode = clean(resolved?.pincode);
  }
  if (!/^\d{6}$/.test(pincode)) throw new Error('Pincode is required and could not be resolved from the supplied location');
  const capacity = Number(row.buyerCapacity);
  return {
    industryId: industry.id, serviceId: service.id, subserviceId: subservice?.id || null,
    stateId: state.id, cityId: city.id, customerName: row.customerName, customerPhone: row.customerPhone,
    customerEmail: row.customerEmail || '', requirement: row.requirement || 'Lead requirement not provided',
    propertyType: row.propertyType || '', budget: row.budget || '', source: row.source || 'lead-partner-upload', notes: row.notes || '',
    pincode, buyerCapacity: Number.isFinite(capacity) && capacity >= 2 ? Math.floor(capacity) : 3,
    leadType: norm(row.leadType) === 'premium' ? 'premium' : 'basic',
    isExclusive: ['true', 'yes', 'y', '1', 'exclusive'].includes(norm(row.isExclusive)),
  };
}

async function importCsv({ userId, csv }) {
  const rows = parseCsv(csv);
  if (!rows.length) throw new Error('CSV contains no data rows');
  const cat = await catalogs();
  const partner = (await pool.query('SELECT id,status FROM lead_partners WHERE user_id=$1 LIMIT 1', [userId])).rows[0];
  if (!partner) throw new Error('Lead Partner profile not found');
  if (partner.status !== 'active') throw new Error('Lead Partner account is not active');
  let created = 0; let failed = 0; let duplicate = 0; const failures = [];
  for (const row of rows) {
    try {
      const lead = await buildLead(row, cat);
      const createdLead = await leadService.createLead({ ...lead, createdBy: userId });
      await pool.query('UPDATE leads SET lead_partner_id=$1 WHERE id=$2 AND created_by=$3', [partner.id, createdLead.id, userId]);
      const configured = await partnerPricing.applyConfiguredPricingToLead(userId, createdLead.id, createdLead.pricing, lead.industryId, lead.cityId, lead.leadType);
      await pool.query(`UPDATE leads SET partner_base_pricing=$1::jsonb,partner_pricing_overridden=$2,partner_pricing_updated_at=$3,pricing=$4::jsonb,updated_at=CURRENT_TIMESTAMP WHERE id=$5 AND created_by=$6`, [JSON.stringify(createdLead.pricing || { shares: [] }), Boolean(configured && JSON.stringify(configured)!==JSON.stringify(createdLead.pricing)), configured && JSON.stringify(configured)!==JSON.stringify(createdLead.pricing) ? new Date() : null, JSON.stringify(configured || createdLead.pricing || { shares: [] }), createdLead.id, userId]);
      created += 1;
    } catch (error) {
      if (error.code === 'DUPLICATE_LEAD') duplicate += 1; else failed += 1;
      failures.push(`${row.id || row.customerPhone || row.customerEmail || created + failed + duplicate}: ${error.message}`);
    }
  }
  return { total: rows.length, created, duplicate, failed, failures };
}

async function importGoogleSheet({ userId, url }) {
  const result = await fetchGoogleSheetCsv(url);
  const imported = await importCsv({ userId, csv: result.csv });
  return { ...imported, spreadsheetId: result.spreadsheetId, gid: result.gid };
}

async function getSheetConnections({ userId }) {
  const result = await pool.query(`SELECT id,spreadsheet_id,gid,source_url,status,last_synced_at,last_sync_created,last_sync_duplicate,last_sync_failed,last_sync_failures,created_at,updated_at FROM lead_partner_sheet_connections WHERE user_id=$1 ORDER BY updated_at DESC,id DESC`, [userId]);
  return result.rows;
}

async function connectGoogleSheet({ userId, url }) {
  const result = await fetchGoogleSheetCsv(url);
  const imported = await importCsv({ userId, csv: result.csv });
  const saved = (await pool.query(`INSERT INTO lead_partner_sheet_connections(user_id,spreadsheet_id,gid,source_url,last_synced_at,last_sync_created,last_sync_duplicate,last_sync_failed,last_sync_failures) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP,$5,$6,$7,$8::jsonb) ON CONFLICT(user_id,spreadsheet_id,gid) DO UPDATE SET source_url=EXCLUDED.source_url,status='active',last_synced_at=EXCLUDED.last_synced_at,last_sync_created=EXCLUDED.last_sync_created,last_sync_duplicate=EXCLUDED.last_sync_duplicate,last_sync_failed=EXCLUDED.last_sync_failed,last_sync_failures=EXCLUDED.last_sync_failures,updated_at=CURRENT_TIMESTAMP RETURNING *`, [userId, result.spreadsheetId, result.gid || '0', url, imported.created, imported.duplicate, imported.failed, JSON.stringify(imported.failures)])).rows[0];
  return { connection: saved, import: imported };
}

async function syncGoogleSheet({ userId, connectionId }) {
  const connection = (await pool.query('SELECT * FROM lead_partner_sheet_connections WHERE id=$1 AND user_id=$2 AND status=\'active\'', [connectionId, userId])).rows[0];
  if (!connection) { const error = new Error('Active Google Sheet connection not found'); error.code = 'SHEET_CONNECTION_NOT_FOUND'; throw error; }
  const result = await fetchGoogleSheetCsv(connection.source_url);
  if (result.spreadsheetId !== connection.spreadsheet_id || String(result.gid || '0') !== String(connection.gid || '0')) throw new Error('Google Sheet URL no longer matches the connected sheet');
  const imported = await importCsv({ userId, csv: result.csv });
  const saved = (await pool.query(`UPDATE lead_partner_sheet_connections SET last_synced_at=CURRENT_TIMESTAMP,last_sync_created=$1,last_sync_duplicate=$2,last_sync_failed=$3,last_sync_failures=$4::jsonb,updated_at=CURRENT_TIMESTAMP WHERE id=$5 AND user_id=$6 RETURNING *`, [imported.created, imported.duplicate, imported.failed, JSON.stringify(imported.failures), connectionId, userId])).rows[0];
  return { connection: saved, import: imported };
}

async function disableSheetConnection({ userId, connectionId }) {
  const result = await pool.query(`UPDATE lead_partner_sheet_connections SET status='disabled',updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND user_id=$2 RETURNING *`, [connectionId, userId]);
  if (!result.rows[0]) { const error = new Error('Sheet connection not found'); error.code = 'SHEET_CONNECTION_NOT_FOUND'; throw error; }
  return result.rows[0];
}

async function listInventory({ userId, status = 'all', search = '' }) {
  const params = [userId]; const conditions = ['l.created_by=$1'];
  if (status && status !== 'all') { params.push(status); conditions.push(`l.status=$${params.length}`); }
  if (clean(search)) { params.push(`%${clean(search)}%`); conditions.push(`(l.customer_name ILIKE $${params.length} OR l.customer_phone ILIKE $${params.length} OR l.requirement ILIKE $${params.length})`); }
  const where = conditions.join(' AND ');
  const [data, stats] = await Promise.all([
    pool.query(`SELECT l.id,l.customer_name,l.customer_phone,l.customer_email,l.requirement,l.status,l.lead_type,l.buyer_capacity,l.is_exclusive,l.pincode,l.created_at,i.name AS industry_name,s.name AS service_name,st.name AS state_name,c.name AS city_name FROM leads l JOIN industries i ON i.id=l.industry_id JOIN services s ON s.id=l.service_id JOIN states st ON st.id=l.state_id JOIN cities c ON c.id=l.city_id WHERE ${where} ORDER BY l.created_at DESC,l.id DESC LIMIT 500`, params),
    pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('available','paused'))::int AS active, COUNT(*) FILTER (WHERE status='sold')::int AS sold, COUNT(*) FILTER (WHERE status='closed')::int AS closed FROM leads WHERE created_by=$1`, [userId]),
  ]);
  return { data: data.rows, stats: stats.rows[0] || {} };
}

module.exports = { importCsv, importGoogleSheet, listInventory, getSheetConnections, connectGoogleSheet, syncGoogleSheet, disableSheetConnection, parseCsv };
