// Meta Lead Ads regression test. Exercises the real service with the database,
// Meta Graph API and lead import pipeline replaced by in-memory stubs.
const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const src = rel => path.join(__dirname, '..', 'src', rel);
process.env.META_APP_ID = '1234567890';
process.env.META_APP_SECRET = 'test-app-secret-0123456789abcdef';
process.env.META_LEADS_WEBHOOK_VERIFY_TOKEN = 'verify-token-0123456789';
process.env.META_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
process.env.JWT_SECRET = 'jwt-secret-for-meta-tests-0123456789';
process.env.META_LEADS_PUBLIC_ORIGIN = 'https://propulsetechnologies.online';

// ---- stubs ---------------------------------------------------------------
const db = { pages: [], events: new Map(), imports: [], queries: [] };
const connectionRow = () => ({
  id: 7, owner_user_id: 42, owner_scope: 'lead_partner', meta_page_id: 3, page_id: '111222333', form_id: '987654321',
  form_name: 'Hyderabad interiors', column_mappings: {}, defaults: {}, default_industry_id: null,
  page_token_encrypted: db.pages[0]?.token,
});
const pool = {
  async query(sql, params = []) {
    db.queries.push(sql);
    if (/SELECT id, role FROM users/.test(sql)) return { rows: [{ id: params[0], role: 'lead_partner' }] };
    if (/INSERT INTO meta_lead_pages/.test(sql)) { db.pages.push({ owner: params[0], scope: params[1], pageId: params[2], token: params[4] }); return { rows: [] }; }
    if (/FROM meta_lead_connections c JOIN meta_lead_pages p[\s\S]*WHERE c.form_id=\$1/.test(sql)) return { rows: params[0] === '987654321' ? [connectionRow()] : [] };
    if (/INSERT INTO meta_lead_events/.test(sql)) {
      const existing = db.events.get(params[0]);
      if (existing && !['received', 'failed', 'ignored'].includes(existing)) return { rows: [] };
      db.events.set(params[0], params[4]);
      return { rows: [{ leadgen_id: params[0] }] };
    }
    if (/UPDATE meta_lead_events SET status/.test(sql)) { db.events.set(params[0], params[1]); return { rows: [] }; }
    return { rows: [] };
  },
};
require.cache[require.resolve(src('config/database'))] = { exports: pool };
require.cache[require.resolve(src('services/leadPartnerService'))] = { exports: { assertActivePartner: async () => ({ id: 9, status: 'active' }) } };
require.cache[require.resolve(src('services/leadPartnerInventoryCompatService'))] = {
  exports: { importCsv: async ({ userId, csv }) => { db.imports.push({ userId, csv }); return { created: 1, duplicate: 0, failed: 0, failures: [] }; }, previewGoogleSheet: async () => ({}) },
};
require.cache[require.resolve(src('services/adminGoogleSheetSyncService'))] = { exports: { syncGoogleSheet: async () => ({ created: 1 }), previewGoogleSheet: async () => ({}) } };

const graphCalls = [];
global.fetch = async (url, init = {}) => {
  const u = new URL(url);
  graphCalls.push({ path: u.pathname, method: init.method || 'GET', query: Object.fromEntries(u.searchParams) });
  assert.strictEqual(u.origin, 'https://graph.facebook.com', 'Graph calls must only go to graph.facebook.com');
  assert.strictEqual(init.redirect, 'error', 'Graph calls must not follow redirects');
  const json = body => ({ ok: true, status: 200, json: async () => body });
  if (u.pathname.endsWith('/oauth/access_token')) return json({ access_token: u.searchParams.get('grant_type') ? 'long-user-token' : 'short-user-token' });
  if (u.pathname.endsWith('/me')) return json({ id: '55500' });
  if (u.pathname.endsWith('/me/accounts')) return json({ data: [{ id: '111222333', name: 'ProPulse Interiors', access_token: 'PAGE-TOKEN-SECRET' }] });
  if (u.pathname.endsWith('/5550001112223')) {
    assert.ok(u.searchParams.get('appsecret_proof'), 'Every token call must include appsecret_proof');
    return json({ id: '5550001112223', created_time: '2026-11-08T10:00:00+0000', ad_name: 'Diwali offer', campaign_name: 'Interiors Q4', platform: 'ig',
      field_data: [{ name: 'full_name', values: ['Asha Rao'] }, { name: 'phone_number', values: ['+919876543210'] }, { name: 'email', values: ['asha@example.com'] }, { name: 'city', values: ['Hyderabad'] }, { name: 'zip_code', values: ['500081'] }, { name: 'what_is_your_budget?', values: ['10-15 lakh'] }] });
  }
  return { ok: false, status: 404, json: async () => ({ error: { message: 'not stubbed ' + u.pathname, code: 100 } }) };
};

const graph = require(src('services/metaGraphClient'));
const sheetPreview = require(src('services/sheetImportPreviewService'));
const service = require(src('services/metaLeadAdsService'));

(async () => {
  // Configuration reporting names only
  assert.deepStrictEqual(graph.missingConfig(), [], 'Complete configuration reports nothing missing');

  // Token encryption: round trip, ciphertext hides the token, tampering fails
  const sealed = graph.encryptToken('PAGE-TOKEN-SECRET');
  assert.ok(!sealed.includes('PAGE-TOKEN-SECRET'));
  assert.strictEqual(graph.decryptToken(sealed), 'PAGE-TOKEN-SECRET');
  const parts = sealed.split(':'); parts[3] = Buffer.from('tampered').toString('base64');
  assert.throws(() => graph.decryptToken(parts.join(':')), 'Tampered ciphertext must not decrypt');

  // Lead -> CSV -> existing mapping: standard Meta fields map automatically
  const csv = service.leadsToCsv({ formName: 'Form A', questions: [], leads: [{ id: '42', created_time: 't', field_data: [{ name: 'full_name', values: ['Asha Rao'] }, { name: 'phone_number', values: ['+919876543210'] }, { name: 'email', values: ['a@b.co'] }, { name: 'zip_code', values: ['500081'] }, { name: 'city', values: ['Hyderabad'] }] }] });
  const analysis = sheetPreview.analyzeCsv(csv, { scope: 'lead_partner' });
  for (const [field, header] of Object.entries({ customerName: 'full name', customerPhone: 'phone number', customerEmail: 'email', pincode: 'zip code', city: 'city', leadId: 'Lead ID', source: 'Source' })) {
    assert.strictEqual(analysis.effectiveMappings[field], header, `Meta field "${header}" must map to ${field}`);
  }
  assert.ok(analysis.mappedCsv.includes('meta-42') && analysis.mappedCsv.includes('Meta Lead Ads'), 'Mapped CSV carries the Meta lead id and source');

  // Webhook subscription handshake
  assert.strictEqual(service.verifyWebhookSubscription({ mode: 'subscribe', token: 'verify-token-0123456789', challenge: '12345' }), '12345');
  assert.strictEqual(service.verifyWebhookSubscription({ mode: 'subscribe', token: 'wrong-token-0123456789x', challenge: '12345' }), null);

  // OAuth: start -> Facebook dialog with redirect + scopes; finish stores ENCRYPTED page tokens
  const { url } = service.startOauth({ userId: 42, scope: 'lead_partner' });
  const dialog = new URL(url);
  assert.strictEqual(dialog.origin, 'https://www.facebook.com');
  assert.strictEqual(dialog.searchParams.get('redirect_uri'), 'https://propulsetechnologies.online/api/meta-leads/oauth/callback');
  assert.ok(dialog.searchParams.get('scope').includes('leads_retrieval'));
  const target = await service.finishOauth({ code: 'AUTHCODE', state: dialog.searchParams.get('state') });
  assert.strictEqual(target, '/lead-partner/inventory?meta=connected');
  assert.strictEqual(db.pages.length, 1);
  assert.ok(!db.pages[0].token.includes('PAGE-TOKEN-SECRET'), 'Page tokens must be stored encrypted');
  assert.strictEqual(graph.decryptToken(db.pages[0].token), 'PAGE-TOKEN-SECRET');
  assert.match(await service.finishOauth({ code: 'X', state: 'forged.state.value' }), /meta=error/, 'Forged state must be rejected');
  assert.match(await service.finishOauth({ state: dialog.searchParams.get('state'), error: 'access_denied' }), /meta=cancelled/);

  // Webhook: bad signature rejected; valid one imports the lead once
  const body = Buffer.from(JSON.stringify({ object: 'page', entry: [{ id: '111222333', changes: [{ field: 'leadgen', value: { leadgen_id: '5550001112223', form_id: '987654321', page_id: '111222333' } }] }] }));
  const sign = buf => 'sha256=' + crypto.createHmac('sha256', process.env.META_APP_SECRET).update(buf).digest('hex');
  assert.throws(() => service.handleWebhook({ rawBody: body, signature: 'sha256=' + '0'.repeat(64) }), e => e.status === 401);
  assert.strictEqual(service.handleWebhook({ rawBody: body, signature: sign(body) }).accepted, 1);
  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(db.imports.length, 1, 'Lead must be imported');
  assert.strictEqual(db.imports[0].userId, 42);
  for (const value of ['Asha Rao', '+919876543210', 'asha@example.com', '500081', 'Meta Lead Ads', 'meta-5550001112223']) {
    assert.ok(db.imports[0].csv.includes(value), `Imported CSV must include ${value}`);
  }
  assert.strictEqual(db.events.get('5550001112223'), 'imported');

  // Meta retries the same webhook: no second import
  service.handleWebhook({ rawBody: body, signature: sign(body) });
  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(db.imports.length, 1, 'Duplicate webhook deliveries must not import twice');

  // Unknown form is acknowledged but ignored
  const other = Buffer.from(JSON.stringify({ object: 'page', entry: [{ changes: [{ field: 'leadgen', value: { leadgen_id: '5550009998887', form_id: '1111111111' } }] }] }));
  service.handleWebhook({ rawBody: other, signature: sign(other) });
  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(db.events.get('5550009998887'), 'ignored');
  assert.strictEqual(db.imports.length, 1);

  // Server wiring: webhook mounted before JSON/CSRF with raw body; owner routes guarded
  const server = fs.readFileSync(src('server.js'), 'utf8');
  const webhookAt = server.indexOf("app.use('/api/meta-leads/webhook',express.raw(");
  assert.ok(webhookAt > 0 && webhookAt < server.indexOf('app.use(express.json('), 'Meta webhook must receive the raw body before JSON parsing');
  assert.ok(webhookAt < server.indexOf("app.use('/api',csrfProtection)"), 'Meta webhook must not require a CSRF token');
  const routes = fs.readFileSync(src('routes/metaLeadAdsRoutes.js'), 'utf8');
  assert.ok(routes.includes("ownerRouter('admin', [requireAdmin])") && routes.includes("ownerRouter('lead_partner', [requireLeadPartner])"), 'Owner routes must use the existing admin and lead-partner guards');

  console.log('Meta Lead Ads OAuth, encryption, webhook signature, idempotent import and mapping checks passed.');
})().catch(error => { console.error(error); process.exit(1); });
