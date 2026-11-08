// Minimal, hardened client for the Meta Graph API used by Meta Lead Ads.
// - Always calls https://graph.facebook.com (no caller-controlled host).
// - Sends appsecret_proof with every token so a leaked token alone is useless.
// - Bounded by a timeout and never follows redirects.
// - Page tokens are stored with AES-256-GCM (META_TOKEN_ENCRYPTION_KEY).
const crypto = require('crypto');

const GRAPH_ORIGIN = 'https://graph.facebook.com';
const DIALOG_ORIGIN = 'https://www.facebook.com';
const DEFAULT_VERSION = 'v23.0';
const DEFAULT_SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_metadata', 'leads_retrieval', 'business_management'];
const REQUEST_TIMEOUT_MS = 12000;

function clean(value) { return String(value ?? '').trim(); }

function encryptionKey() {
  const raw = clean(process.env.META_TOKEN_ENCRYPTION_KEY);
  if (!raw) return null;
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  return key.length === 32 ? key : null;
}

// Meta requires the OAuth redirect to match the registered URL exactly, so use
// the canonical site unless META_LEADS_PUBLIC_ORIGIN deliberately overrides it.
function publicOrigin() {
  const configured = clean(process.env.META_LEADS_PUBLIC_ORIGIN);
  try {
    const url = new URL(configured);
    if (url.protocol === 'https:' || (url.protocol === 'http:' && process.env.NODE_ENV !== 'production')) return url.origin;
  } catch {}
  return 'https://propulsetechnologies.online';
}

function config() {
  const version = clean(process.env.META_GRAPH_API_VERSION);
  const scopes = clean(process.env.META_LEADS_OAUTH_SCOPES);
  return {
    appId: clean(process.env.META_APP_ID),
    appSecret: clean(process.env.META_APP_SECRET),
    version: /^v\d{1,3}\.\d{1,2}$/.test(version) ? version : DEFAULT_VERSION,
    verifyToken: clean(process.env.META_LEADS_WEBHOOK_VERIFY_TOKEN),
    loginConfigId: clean(process.env.META_LEADS_LOGIN_CONFIG_ID),
    scopes: scopes ? scopes.split(/[\s,]+/).filter(Boolean) : DEFAULT_SCOPES,
    key: encryptionKey(),
    redirectUri: publicOrigin() + '/api/meta-leads/oauth/callback',
  };
}

// Names (never values) of the settings still needed before Meta can be used.
function missingConfig() {
  const c = config();
  const missing = [];
  if (!/^\d{5,20}$/.test(c.appId)) missing.push('META_APP_ID');
  if (c.appSecret.length < 16) missing.push('META_APP_SECRET');
  if (c.verifyToken.length < 16) missing.push('META_LEADS_WEBHOOK_VERIFY_TOKEN');
  if (!c.key) missing.push('META_TOKEN_ENCRYPTION_KEY');
  return missing;
}

function encryptToken(token) {
  const key = encryptionKey();
  if (!key) throw Object.assign(new Error('Meta token encryption key is not configured'), { code: 'META_NOT_CONFIGURED' });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(String(token), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

function decryptToken(value) {
  const key = encryptionKey();
  const parts = String(value || '').split(':');
  if (!key || parts.length !== 4 || parts[0] !== 'v1') throw Object.assign(new Error('Stored Meta token cannot be read; reconnect Meta'), { code: 'META_TOKEN_UNREADABLE' });
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[1], 'base64'));
  decipher.setAuthTag(Buffer.from(parts[2], 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64')), decipher.final()]).toString('utf8');
}

function appSecretProof(token) {
  return crypto.createHmac('sha256', config().appSecret).update(String(token)).digest('hex');
}

function graphError(status, body) {
  const meta = body && body.error ? body.error : {};
  const message = clean(meta.error_user_msg || meta.message || `Meta request failed (${status})`).slice(0, 300);
  const error = new Error(message);
  error.code = 'META_GRAPH_ERROR';
  error.status = status;
  error.metaCode = meta.code;
  error.metaSubcode = meta.error_subcode;
  // 190 = invalid/expired token, 10/200-299 = permission problems.
  error.needsReconnect = meta.code === 190 || meta.code === 10 || (meta.code >= 200 && meta.code < 300);
  return error;
}

async function graphRequest(path, { method = 'GET', params = {}, token = null, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const c = config();
  if (!/^[A-Za-z0-9_/.-]+$/.test(String(path))) throw new Error('Invalid Meta Graph path');
  const url = new URL(`${GRAPH_ORIGIN}/${c.version}/${String(path).replace(/^\/+/, '')}`);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  if (token) { query.set('access_token', token); query.set('appsecret_proof', appSecretProof(token)); }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init = { method, redirect: 'error', signal: controller.signal, headers: { Accept: 'application/json' } };
    if (method === 'GET' || method === 'DELETE') url.search = query.toString();
    else { init.body = query; init.headers['Content-Type'] = 'application/x-www-form-urlencoded'; }
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.error) throw graphError(response.status, body);
    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw Object.assign(new Error('Meta did not respond in time; please retry'), { code: 'META_TIMEOUT' });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Follow Graph cursor pagination up to maxItems.
async function graphList(path, { params = {}, token, maxItems = 200 } = {}) {
  const items = [];
  let after = null;
  do {
    const page = await graphRequest(path, { params: { ...params, limit: Math.min(100, maxItems), after }, token });
    items.push(...(Array.isArray(page.data) ? page.data : []));
    after = page.paging?.next ? page.paging?.cursors?.after : null;
  } while (after && items.length < maxItems);
  return items.slice(0, maxItems);
}

function loginDialogUrl(state) {
  const c = config();
  const url = new URL(`${DIALOG_ORIGIN}/${c.version}/dialog/oauth`);
  url.searchParams.set('client_id', c.appId);
  url.searchParams.set('redirect_uri', c.redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  if (c.loginConfigId) url.searchParams.set('config_id', c.loginConfigId);
  else url.searchParams.set('scope', c.scopes.join(','));
  return url.toString();
}

async function exchangeCodeForLongLivedToken(code) {
  const c = config();
  const short = await graphRequest('oauth/access_token', { params: { client_id: c.appId, client_secret: c.appSecret, redirect_uri: c.redirectUri, code } });
  const long = await graphRequest('oauth/access_token', { params: { grant_type: 'fb_exchange_token', client_id: c.appId, client_secret: c.appSecret, fb_exchange_token: short.access_token } });
  return long.access_token || short.access_token;
}

// X-Hub-Signature-256: "sha256=<hex HMAC of the raw body with the app secret>"
function verifyWebhookSignature(rawBody, header) {
  const secret = config().appSecret;
  const match = /^sha256=([0-9a-f]{64})$/i.exec(clean(header));
  if (!secret || !match || !Buffer.isBuffer(rawBody)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  const supplied = Buffer.from(match[1], 'hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

module.exports = {
  config, missingConfig, encryptToken, decryptToken, graphRequest, graphList,
  loginDialogUrl, exchangeCodeForLongLivedToken, verifyWebhookSignature, appSecretProof,
};
