// Meta (Facebook/Instagram) Lead Ads as a lead source for admin and lead partners.
//
// Flow: owner logs in with Facebook -> Propulse stores their Page tokens
// (encrypted) -> owner picks a lead form and maps its questions exactly like a
// Google Sheet -> Propulse subscribes the Page to the `leadgen` webhook.
// Each new lead is pushed by Meta in real time, fetched once, turned into a
// one-row CSV and sent through the SAME import pipeline as Google Sheets
// (duplicate checks, quality gate, partner pricing). Nothing polls Meta.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const graph = require('./metaGraphClient');
const metaAdPricing = require('./metaAdPricingService');
const sheetPreview = require('./sheetImportPreviewService');
const partnerSheets = require('./leadPartnerInventoryCompatService');
const adminSheets = require('./adminGoogleSheetSyncService');
const leadPartnerService = require('./leadPartnerService');
const { resolvePincode } = require('./pincodeService');

const SCOPES = new Set(['admin', 'lead_partner']);
const STATE_AUDIENCE = 'propulse-meta-leads-oauth';
const RETURN_PATHS = { admin: '/admin/leads/sheets', lead_partner: '/lead-partner/inventory' };
const SAMPLE_LEADS = 25;
const BACKFILL_DAYS = 30;
const BACKFILL_MAX = 500;
const FIXED_HEADERS = ['Lead ID', 'Created At', 'Source', 'Meta Form', 'Meta Ad', 'Meta Campaign', 'Meta Platform', 'Meta Ad ID', 'Meta Ad Spend Total', 'Meta Ad Spend Delta', 'Normal 1 Buyer Price', 'Pro 1 Buyer Price'];

function clean(value) { return String(value ?? '').trim(); }
function stateSecret() {
  const secret = clean(process.env.JWT_SECRET);
  if (secret.length < 16) throw Object.assign(new Error('Server session secret is not configured'), { code: 'META_NOT_CONFIGURED' });
  return secret + ':meta-leads';
}
function assertScope(scope) {
  if (!SCOPES.has(scope)) throw Object.assign(new Error('Unknown Meta connection scope'), { status: 400 });
  return scope;
}
function assertConfigured() {
  const missing = graph.missingConfig();
  if (missing.length) throw Object.assign(new Error('Meta Lead Ads is not configured on the server yet'), { status: 503, code: 'META_NOT_CONFIGURED', missing });
}
function httpError(status, message, code) { return Object.assign(new Error(message), { status, code }); }

async function assertOwnerAllowed(userId, scope) {
  const user = (await pool.query('SELECT id, role FROM users WHERE id=$1', [userId])).rows[0];
  if (!user) throw httpError(403, 'Account not found');
  if (scope === 'admin' && user.role !== 'admin') throw httpError(403, 'Admin access required');
  if (scope === 'lead_partner') {
    if (user.role !== 'lead_partner') throw httpError(403, 'Lead Partner access required');
    await leadPartnerService.assertActivePartner(userId);
  }
}

// ---------- CSV conversion (Meta lead -> the same CSV a sheet would give) ----------
function csvEscape(value) { return `"${clean(value).replace(/"/g, '""')}"`; }
function questionHeader(key) { return clean(key).replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function fieldValue(field) { return (Array.isArray(field?.values) ? field.values : [field?.values]).filter(v => v !== undefined && v !== null).join(', '); }

function leadsToCsv({ formName = '', questions = [], leads = [] }) {
  const questionHeaders = [];
  const add = header => { if (header && !questionHeaders.includes(header) && !FIXED_HEADERS.includes(header)) questionHeaders.push(header); };
  for (const q of questions) add(questionHeader(q?.key));
  for (const lead of leads) for (const field of lead?.field_data || []) add(questionHeader(field?.name));
  const headers = [...FIXED_HEADERS, ...questionHeaders];
  const rows = leads.map(lead => {
    const byHeader = new Map((lead.field_data || []).map(field => [questionHeader(field.name), fieldValue(field)]));
    return headers.map(header => {
      switch (header) {
        case 'Lead ID': return 'meta-' + clean(lead.id);
        case 'Created At': return clean(lead.created_time);
        case 'Source': return 'Meta Lead Ads';
        case 'Meta Form': return formName;
        case 'Meta Ad': return clean(lead.ad_name);
        case 'Meta Campaign': return clean(lead.campaign_name);
        case 'Meta Platform': return clean(lead.platform);
        case 'Meta Ad ID': return clean(lead.ad_id);
        case 'Meta Ad Spend Total': return lead.__propulsePricing?.totalSpend ?? '';
        case 'Meta Ad Spend Delta': return lead.__propulsePricing?.spendDelta ?? '';
        case 'Normal 1 Buyer Price': return lead.__propulsePricing?.nonMemberPrice ?? '';
        case 'Pro 1 Buyer Price': return lead.__propulsePricing?.memberPrice ?? '';
        default: return byHeader.get(header) ?? '';
      }
    });
  });
  return [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\n');
}

// Lead partner imports require a 6-digit PIN, but Meta forms often only ask
// for a locality or city. Infer the PIN the same way the admin import does
// (only when the place maps to exactly one PIN) before handing rows over.
const LOCALITY_HEADERS = ['locality', 'area', 'location', 'address', 'street address', 'post office', 'sub city', 'subcity'];
async function fillMissingPincodes(csv, { columnMappings = {}, scope = 'lead_partner' } = {}) {
  const matrix = sheetPreview.parseCsvMatrix(csv);
  if (matrix.length < 2) return csv;
  const headers = matrix[0];
  const mappings = sheetPreview.analyzeCsv(csv, { columnMappings, scope }).effectiveMappings || {};
  const indexOf = header => header ? headers.findIndex(h => h === header) : -1;
  let pinIndex = indexOf(mappings.pincode);
  const cityIndex = indexOf(mappings.city);
  const localityIndexes = headers.map((h, i) => LOCALITY_HEADERS.includes(clean(h).toLowerCase()) ? i : -1).filter(i => i >= 0);
  if (pinIndex < 0) { headers.push('Pincode'); pinIndex = headers.length - 1; matrix.slice(1).forEach(row => { row[pinIndex] = ''; }); }
  const cache = new Map();
  for (const row of matrix.slice(1)) {
    if (/^\d{6}$/.test(clean(row[pinIndex]).replace(/\D/g, ''))) continue;
    for (const place of [...localityIndexes.map(i => row[i]), cityIndex >= 0 ? row[cityIndex] : ''].map(clean).filter(Boolean)) {
      const key = place.toLowerCase();
      if (!cache.has(key)) cache.set(key, resolvePincode({ location: place }).then(r => r?.pincode || '').catch(() => ''));
      const pin = await cache.get(key);
      if (pin) { row[pinIndex] = pin; break; }
    }
  }
  return matrix.map(row => headers.map((_, i) => csvEscape(row[i] ?? '')).join(',')).join('\n');
}

// ---------- OAuth ----------
function startOauth({ userId, scope }) {
  assertConfigured();
  assertScope(scope);
  const state = jwt.sign({ u: Number(userId), s: scope, n: crypto.randomBytes(12).toString('hex') }, stateSecret(), { expiresIn: '15m', audience: STATE_AUDIENCE });
  return { url: graph.loginDialogUrl(state) };
}

function returnPath(scope, outcome, reason) {
  const base = RETURN_PATHS[scope] || '/';
  const query = new URLSearchParams({ meta: outcome });
  if (reason) query.set('reason', String(reason).slice(0, 120));
  return `${base}?${query.toString()}`;
}

async function finishOauth({ code, state, error }) {
  let payload;
  try { payload = jwt.verify(clean(state), stateSecret(), { audience: STATE_AUDIENCE }); }
  catch { return returnPath('lead_partner', 'error', 'This Meta login link expired. Please try Connect Meta again.'); }
  const scope = SCOPES.has(payload.s) ? payload.s : 'lead_partner';
  if (error || !code) return returnPath(scope, 'cancelled', 'Meta login was cancelled.');
  try {
    assertConfigured();
    await assertOwnerAllowed(payload.u, scope);
    const userToken = await graph.exchangeCodeForLongLivedToken(clean(code));
    const me = await graph.graphRequest('me', { params: { fields: 'id' }, token: userToken });
    const pages = await graph.graphList('me/accounts', { params: { fields: 'id,name,access_token,tasks' }, token: userToken, maxItems: 200 });
    const usable = pages.filter(page => page?.id && page?.access_token);
    if (!usable.length) return returnPath(scope, 'error', 'No Facebook Pages were shared. Select at least one Page when logging in.');
    for (const page of usable) {
      await pool.query(
        `INSERT INTO meta_lead_pages(owner_user_id,owner_scope,page_id,page_name,page_token_encrypted,meta_user_id,meta_user_token_encrypted)
         VALUES($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT(owner_user_id,owner_scope,page_id) DO UPDATE SET
           page_name=EXCLUDED.page_name,page_token_encrypted=EXCLUDED.page_token_encrypted,
           meta_user_id=EXCLUDED.meta_user_id,meta_user_token_encrypted=EXCLUDED.meta_user_token_encrypted,authorized_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`,
        [payload.u, scope, clean(page.id), clean(page.name).slice(0, 255), graph.encryptToken(page.access_token), clean(me.id) || null, graph.encryptToken(userToken)]
      );
    }
    return returnPath(scope, 'connected');
  } catch (err) {
    console.error('Meta Lead Ads OAuth failed:', err?.message || err);
    return returnPath(scope, 'error', err?.code === 'META_GRAPH_ERROR' ? err.message : 'Meta connection failed. Please try again.');
  }
}

// ---------- Pages, forms, preview ----------
async function pageRow({ userId, scope, pageId }) {
  const row = (await pool.query('SELECT * FROM meta_lead_pages WHERE owner_user_id=$1 AND owner_scope=$2 AND page_id=$3', [userId, scope, clean(pageId)])).rows[0];
  if (!row) throw httpError(404, 'Facebook Page is not connected. Use Connect Meta first.');
  return row;
}

async function getStatus({ userId, scope }) {
  assertScope(scope);
  const missing = graph.missingConfig();
  const [pages, connections] = await Promise.all([
    pool.query('SELECT page_id,page_name,authorized_at FROM meta_lead_pages WHERE owner_user_id=$1 AND owner_scope=$2 ORDER BY page_name', [userId, scope]),
    listConnections({ userId, scope }),
  ]);
  return {
    configured: missing.length === 0,
    missing,
    webhookUrl: graph.config().redirectUri.replace('/oauth/callback', '/webhook'),
    redirectUri: graph.config().redirectUri,
    pages: pages.rows.map(p => ({ pageId: p.page_id, name: p.page_name, authorizedAt: p.authorized_at })),
    connections,
  };
}

async function listForms({ userId, scope, pageId }) {
  assertConfigured();
  const page = await pageRow({ userId, scope, pageId });
  const token = graph.decryptToken(page.page_token_encrypted);
  const forms = await graph.graphList(`${page.page_id}/leadgen_forms`, { params: { fields: 'id,name,status,leads_count,created_time' }, token, maxItems: 200 });
  const used = (await pool.query(`SELECT form_id,owner_user_id,owner_scope FROM meta_lead_connections WHERE status='active' AND form_id=ANY($1::varchar[])`, [forms.map(f => clean(f.id))])).rows;
  const usage = new Map(used.map(row => [row.form_id, row]));
  return forms.map(form => {
    const owner = usage.get(clean(form.id));
    return {
      formId: clean(form.id), name: clean(form.name), status: clean(form.status), leadsCount: Number(form.leads_count) || 0,
      connectedHere: Boolean(owner && Number(owner.owner_user_id) === Number(userId) && owner.owner_scope === scope),
      connectedElsewhere: Boolean(owner && !(Number(owner.owner_user_id) === Number(userId) && owner.owner_scope === scope)),
    };
  });
}

async function formSnapshot({ token, formId, sampleLimit = SAMPLE_LEADS, since = null }) {
  const form = await graph.graphRequest(clean(formId), { params: { fields: 'id,name,page,questions{key,label,type}' }, token });
  const params = { fields: 'id,created_time,field_data,ad_id,ad_name,campaign_name,platform' };
  if (since) params.filtering = JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: Math.floor(since.getTime() / 1000) }]);
  const leads = sampleLimit > 0 ? await graph.graphList(`${clean(formId)}/leads`, { params, token, maxItems: sampleLimit }) : [];
  return { form, leads, csv: leadsToCsv({ formName: clean(form.name), questions: form.questions || [], leads }) };
}

async function previewForm({ userId, scope, pageId, formId, columnMappings = {}, defaultIndustryId = null, defaults = {} }) {
  assertConfigured();
  const page = await pageRow({ userId, scope, pageId });
  const token = graph.decryptToken(page.page_token_encrypted);
  const { form, leads, csv } = await formSnapshot({ token, formId });
  if (!form?.page?.id || clean(form.page.id) !== page.page_id) throw httpError(400, 'This lead form does not belong to the selected Page');
  const prepared = scope === 'lead_partner' && leads.length ? await fillMissingPincodes(csv, { columnMappings, scope }) : csv;
  const sheetResult = { csv: prepared, spreadsheetId: null, gid: null };
  if (!leads.length) {
    // A new form with no leads yet: still let the owner map its questions.
    const analysis = sheetPreview.analyzeCsv(csv, { columnMappings, scope });
    return {
      formName: clean(form.name), sampleCount: 0, headers: analysis.headers, mappingFields: analysis.mappingFields,
      columnMappings: analysis.effectiveMappings, mappingWarnings: analysis.mappingWarnings,
      summary: { total: 0, valid: 0, warning: 0, invalid: 0, mappingWarnings: analysis.mappingWarnings }, rows: [],
    };
  }
  const preview = scope === 'admin'
    ? await adminSheets.previewGoogleSheet({ adminId: userId, url: null, defaults, columnMappings, defaultIndustryId, sheetResult, issueToken: false })
    : await partnerSheets.previewGoogleSheet({ userId, url: null, columnMappings, defaultIndustryId, sheetResult, issueToken: false });
  return { ...preview, formName: clean(form.name), sampleCount: leads.length };
}

// ---------- Connections ----------
function toConnection(row) {
  return {
    id: row.id, pageId: row.page_id, pageName: row.page_name || '', formId: row.form_id, formName: row.form_name,
    status: row.status, defaultIndustryId: row.default_industry_id, columnMappings: row.column_mappings || {},
    leadsReceived: row.leads_received, leadsCreated: row.leads_created, leadsDuplicate: row.leads_duplicate, leadsFailed: row.leads_failed,
    lastLeadAt: row.last_lead_at, lastError: row.last_error, lastErrorAt: row.last_error_at, createdAt: row.created_at,
  };
}

async function listConnections({ userId, scope }) {
  const rows = (await pool.query(
    `SELECT c.*,p.page_name FROM meta_lead_connections c JOIN meta_lead_pages p ON p.id=c.meta_page_id
      WHERE c.owner_user_id=$1 AND c.owner_scope=$2 AND c.status='active' ORDER BY c.created_at DESC`,
    [userId, scope]
  )).rows;
  return rows.map(toConnection);
}

async function connectForm({ userId, scope, pageId, formId, columnMappings = {}, defaultIndustryId = null, defaults = {} }) {
  assertConfigured();
  await assertOwnerAllowed(userId, scope);
  const page = await pageRow({ userId, scope, pageId });
  const token = graph.decryptToken(page.page_token_encrypted);
  const form = await graph.graphRequest(clean(formId), { params: { fields: 'id,name,page,questions{key,label,type}' }, token });
  if (!form?.page?.id || clean(form.page.id) !== page.page_id) throw httpError(400, 'This lead form does not belong to the selected Page');
  const analysis = sheetPreview.analyzeCsv(leadsToCsv({ formName: clean(form.name), questions: form.questions || [], leads: [] }), { columnMappings, scope });
  const industryId = Number(defaultIndustryId) > 0 ? Number(defaultIndustryId) : null;
  // Subscribing is idempotent; Meta then pushes `leadgen` events for this Page.
  await graph.graphRequest(`${page.page_id}/subscribed_apps`, { method: 'POST', params: { subscribed_fields: 'leadgen' }, token });
  let row;
  try {
    row = (await pool.query(
      `INSERT INTO meta_lead_connections(owner_user_id,owner_scope,meta_page_id,page_id,form_id,form_name,column_mappings,defaults,default_industry_id)
       VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9) RETURNING *`,
      [userId, scope, page.id, page.page_id, clean(form.id), clean(form.name).slice(0, 255), JSON.stringify(analysis.effectiveMappings), JSON.stringify(defaults || {}), industryId]
    )).rows[0];
  } catch (error) {
    if (error.code === '23505') throw httpError(409, 'This lead form is already connected. Disconnect it first to change its owner or mapping.');
    throw error;
  }
  // Bring in the last 30 days in the background so the owner is not kept waiting.
  setImmediate(() => { backfillConnection({ connectionId: row.id }).catch(err => console.error('Meta initial backfill failed:', err?.message || err)); });
  return { ...toConnection({ ...row, page_name: page.page_name }), backfillStarted: true };
}

async function disconnectForm({ userId, scope, connectionId }) {
  const row = (await pool.query(
    `UPDATE meta_lead_connections SET status='disabled',updated_at=CURRENT_TIMESTAMP
      WHERE id=$1 AND owner_user_id=$2 AND owner_scope=$3 AND status='active' RETURNING *`,
    [Number(connectionId), userId, scope]
  )).rows[0];
  if (!row) throw httpError(404, 'Active Meta lead form connection not found');
  await unsubscribePageIfUnused(row.meta_page_id).catch(err => console.error('Meta page unsubscribe failed:', err?.message || err));
  return { disconnected: true };
}

// Forget all Pages and tokens for this owner (also disables their forms).
async function disconnectAccount({ userId, scope }) {
  const pages = (await pool.query('SELECT id FROM meta_lead_pages WHERE owner_user_id=$1 AND owner_scope=$2', [userId, scope])).rows;
  await pool.query(`UPDATE meta_lead_connections SET status='disabled',updated_at=CURRENT_TIMESTAMP WHERE owner_user_id=$1 AND owner_scope=$2 AND status='active'`, [userId, scope]);
  for (const page of pages) await unsubscribePageIfUnused(page.id).catch(() => {});
  await pool.query('DELETE FROM meta_lead_pages WHERE owner_user_id=$1 AND owner_scope=$2', [userId, scope]);
  return { disconnected: true, pagesRemoved: pages.length };
}

async function unsubscribePageIfUnused(metaPageRowId) {
  const page = (await pool.query('SELECT * FROM meta_lead_pages WHERE id=$1', [metaPageRowId])).rows[0];
  if (!page) return;
  const stillUsed = (await pool.query(`SELECT 1 FROM meta_lead_connections WHERE page_id=$1 AND status='active' LIMIT 1`, [page.page_id])).rows.length > 0;
  if (stillUsed) return;
  await graph.graphRequest(`${page.page_id}/subscribed_apps`, { method: 'DELETE', token: graph.decryptToken(page.page_token_encrypted) });
}

// ---------- Importing leads ----------
async function importCsvForConnection(connection, csv) {
  const mappings = connection.column_mappings || {};
  if (connection.owner_scope === 'admin') {
    const result = await adminSheets.syncGoogleSheet({
      adminId: connection.owner_user_id, url: null, defaults: connection.defaults || {}, columnMappings: mappings,
      defaultIndustryId: connection.default_industry_id, force: true, sheetResult: { csv, spreadsheetId: null, gid: null },
    });
    return { created: result.created || 0, duplicate: (result.updated || 0) + (result.unchanged || 0), failed: result.failed || 0, failures: result.failures || [] };
  }
  const prepared = await fillMissingPincodes(csv, { columnMappings: mappings, scope: 'lead_partner' });
  const analysis = sheetPreview.analyzeCsv(prepared, { columnMappings: mappings, scope: 'lead_partner' });
  const result = await partnerSheets.importCsv({ userId: connection.owner_user_id, csv: analysis.mappedCsv, defaultIndustryId: connection.default_industry_id });
  return { created: result.created || 0, duplicate: result.duplicate || 0, failed: result.failed || 0, failures: result.failures || [] };
}

async function recordOutcome(connectionId, leadgenId, outcome, error) {
  const status = outcome.created ? 'imported' : outcome.duplicate ? 'duplicate' : 'failed';
  await pool.query(`UPDATE meta_lead_events SET status=$2,error=$3,processed_at=CURRENT_TIMESTAMP,attempts=attempts+1 WHERE leadgen_id=$1`, [leadgenId, status, error ? String(error).slice(0, 500) : null]);
  await pool.query(
    `UPDATE meta_lead_connections SET leads_received=leads_received+1,leads_created=leads_created+$2,leads_duplicate=leads_duplicate+$3,leads_failed=leads_failed+$4,
       last_lead_at=CURRENT_TIMESTAMP,last_error=CASE WHEN $4>0 THEN $5 ELSE last_error END,last_error_at=CASE WHEN $4>0 THEN CURRENT_TIMESTAMP ELSE last_error_at END,
       updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
    [connectionId, outcome.created ? 1 : 0, !outcome.created && outcome.duplicate ? 1 : 0, !outcome.created && !outcome.duplicate ? 1 : 0, error ? String(error).slice(0, 500) : null]
  );
}

// Import one Meta lead. `lead` may be supplied by a backfill listing to avoid a refetch.
async function processLead({ leadgenId, formId, lead = null }) {
  const id = clean(leadgenId);
  if (!/^\d{5,30}$/.test(id)) return { status: 'ignored' };
  const connection = (await pool.query(
    `SELECT c.*,p.page_token_encrypted,p.meta_user_token_encrypted FROM meta_lead_connections c JOIN meta_lead_pages p ON p.id=c.meta_page_id
      WHERE c.form_id=$1 AND c.status='active' LIMIT 1`, [clean(formId)]
  )).rows[0];
  const claimed = (await pool.query(
    `INSERT INTO meta_lead_events(leadgen_id,connection_id,form_id,page_id,status) VALUES($1,$2,$3,$4,$5)
     ON CONFLICT(leadgen_id) DO UPDATE SET connection_id=EXCLUDED.connection_id,status=EXCLUDED.status
       WHERE meta_lead_events.status IN ('received','failed','ignored')
     RETURNING *`,
    [id, connection?.id || null, clean(formId) || null, connection?.page_id || null, connection ? 'received' : 'ignored']
  )).rows[0];
  if (!claimed) return { status: 'already-processed' };
  if (!connection) return { status: 'ignored' };
  try {
    const token = graph.decryptToken(connection.page_token_encrypted);
    const fullLead = lead || await graph.graphRequest(id, { params: { fields: 'id,created_time,field_data,ad_id,ad_name,campaign_name,platform,form_id' }, token });
    let pricing = null;
    if (connection.owner_scope === 'admin') {
      if (claimed.normal_price !== null && claimed.normal_price !== undefined && claimed.member_price !== null && claimed.member_price !== undefined) {
        pricing = { adId: claimed.ad_id, totalSpend: Number(claimed.total_spend), spendDelta: Number(claimed.spend_delta), nonMemberPrice: Number(claimed.normal_price), memberPrice: Number(claimed.member_price) };
      } else {
        const result = await metaAdPricing.priceLead({ adId: fullLead.ad_id, userTokenEncrypted: connection.meta_user_token_encrypted });
        pricing = result.pricing;
        if (pricing) await pool.query('UPDATE meta_lead_events SET ad_id=$2,ad_account_id=$3,total_spend=$4,spend_delta=$5,normal_price=$6,member_price=$7,pricing_error=NULL WHERE leadgen_id=$1', [id, pricing.adId, pricing.adAccountId, pricing.totalSpend, pricing.spendDelta, pricing.nonMemberPrice, pricing.memberPrice]);
        else await pool.query('UPDATE meta_lead_events SET ad_id=$2,pricing_error=$3 WHERE leadgen_id=$1', [id, clean(fullLead.ad_id) || null, result.error]);
      }
    }
    const pricedLead = pricing ? { ...fullLead, __propulsePricing: pricing } : fullLead;
    const csv = leadsToCsv({ formName: connection.form_name, questions: [], leads: [pricedLead] });
    const outcome = await importCsvForConnection(connection, csv);
    await recordOutcome(connection.id, id, outcome, outcome.failures?.[0]);
    return { status: outcome.created ? 'imported' : outcome.duplicate ? 'duplicate' : 'failed' };
  } catch (error) {
    await recordOutcome(connection.id, id, { created: 0, duplicate: 0 }, error?.message || 'Import failed');
    return { status: 'failed', error: error?.message };
  }
}

// Leads are imported one at a time so a burst of webhooks cannot exhaust the
// small database pool that also serves website visitors.
let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

function handleWebhook({ rawBody, signature }) {
  if (!graph.verifyWebhookSignature(rawBody, signature)) throw httpError(401, 'Invalid Meta signature');
  let payload;
  try { payload = JSON.parse(rawBody.toString('utf8')); } catch { throw httpError(400, 'Invalid JSON'); }
  if (payload?.object !== 'page') return { accepted: 0 };
  const changes = [];
  for (const entry of Array.isArray(payload.entry) ? payload.entry : []) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      if (change?.field === 'leadgen' && change.value?.leadgen_id) changes.push({ leadgenId: change.value.leadgen_id, formId: change.value.form_id });
    }
  }
  for (const change of changes) enqueue(() => processLead(change).catch(err => console.error('Meta lead import failed:', err?.message || err)));
  return { accepted: changes.length };
}

function verifyWebhookSubscription({ mode, token, challenge }) {
  const expected = graph.config().verifyToken;
  const supplied = clean(token);
  const ok = mode === 'subscribe' && expected.length >= 16 && supplied.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  return ok ? clean(challenge).slice(0, 200) : null;
}

// Manual or post-connect catch-up for leads Meta may have sent while the site was down.
async function backfillConnection({ connectionId, userId = null, scope = null, days = BACKFILL_DAYS }) {
  const params = [Number(connectionId)];
  let where = `c.id=$1 AND c.status='active'`;
  if (userId !== null) { params.push(userId, scope); where += ' AND c.owner_user_id=$2 AND c.owner_scope=$3'; }
  const connection = (await pool.query(
    `SELECT c.*,p.page_token_encrypted FROM meta_lead_connections c JOIN meta_lead_pages p ON p.id=c.meta_page_id WHERE ${where}`, params
  )).rows[0];
  if (!connection) throw httpError(404, 'Active Meta lead form connection not found');
  const token = graph.decryptToken(connection.page_token_encrypted);
  const since = new Date(Date.now() - Math.min(90, Math.max(1, Number(days) || BACKFILL_DAYS)) * 86400000);
  const { leads } = await formSnapshot({ token, formId: connection.form_id, sampleLimit: BACKFILL_MAX, since });
  const counts = { checked: leads.length, imported: 0, duplicate: 0, failed: 0, skipped: 0 };
  for (const lead of leads.reverse()) {
    const result = await enqueue(() => processLead({ leadgenId: lead.id, formId: connection.form_id, lead }));
    if (result.status === 'imported') counts.imported += 1;
    else if (result.status === 'duplicate') counts.duplicate += 1;
    else if (result.status === 'failed') counts.failed += 1;
    else counts.skipped += 1;
  }
  return counts;
}

module.exports = {
  assertScope, getStatus, startOauth, finishOauth, listForms, previewForm, connectForm, disconnectForm, disconnectAccount,
  listConnections, backfillConnection, handleWebhook, verifyWebhookSubscription, processLead, leadsToCsv, returnPath, fillMissingPincodes,
};
