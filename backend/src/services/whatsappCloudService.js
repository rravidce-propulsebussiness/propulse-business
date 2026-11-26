const crypto = require('crypto');
const pool = require('../config/database');

const GRAPH_ORIGIN = 'https://graph.facebook.com';
const DEFAULT_VERSION = 'v25.0';
const REQUEST_TIMEOUT_MS = 12000;

function clean(value) { return String(value ?? '').trim(); }
function env(...names) {
  for (const name of names) {
    const value = clean(process.env[name]);
    if (value) return value;
  }
  return '';
}
function config() {
  return {
    appSecret: env('META_WHATSAPP_APP_SECRET', 'META_APP_SECRET'),
    verifyToken: env('META_WHATSAPP_VERIFY_TOKEN', 'META_LEADS_WEBHOOK_VERIFY_TOKEN'),
    version: /^v\d{1,3}\.\d{1,2}$/.test(env('META_WHATSAPP_GRAPH_API_VERSION', 'META_GRAPH_API_VERSION'))
      ? env('META_WHATSAPP_GRAPH_API_VERSION', 'META_GRAPH_API_VERSION')
      : DEFAULT_VERSION,
  };
}
function encryptionKey() {
  const raw = env('META_WHATSAPP_TOKEN_ENCRYPTION_KEY', 'META_TOKEN_ENCRYPTION_KEY');
  if (!raw) return null;
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  return key.length === 32 ? key : null;
}
function missingConfig() {
  const missing = [];
  if (config().appSecret.length < 16) missing.push('META_WHATSAPP_APP_SECRET');
  if (config().verifyToken.length < 16) missing.push('META_WHATSAPP_VERIFY_TOKEN');
  if (!encryptionKey()) missing.push('META_WHATSAPP_TOKEN_ENCRYPTION_KEY');
  return missing;
}
function encryptToken(token) {
  const key = encryptionKey();
  if (!key) throw Object.assign(new Error('WhatsApp token encryption is not configured'), { code: 'WHATSAPP_NOT_CONFIGURED' });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(clean(token), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}
function decryptToken(value) {
  const key = encryptionKey();
  const parts = String(value || '').split(':');
  if (!key || parts.length !== 4 || parts[0] !== 'v1') {
    throw Object.assign(new Error('Stored WhatsApp token cannot be read; reconnect WhatsApp'), { code: 'WHATSAPP_TOKEN_UNREADABLE' });
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[1], 'base64'));
  decipher.setAuthTag(Buffer.from(parts[2], 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64')), decipher.final()]).toString('utf8');
}
function appSecretProof(token) {
  return crypto.createHmac('sha256', config().appSecret).update(clean(token)).digest('hex');
}
function graphError(status, body) {
  const meta = body?.error || {};
  const error = new Error(clean(meta.error_user_msg || meta.message || `WhatsApp Graph request failed (${status})`).slice(0, 300));
  error.code = 'WHATSAPP_GRAPH_ERROR';
  error.status = status;
  error.metaCode = meta.code;
  error.metaSubcode = meta.error_subcode;
  return error;
}
async function graphRequest(path, { method = 'GET', params = {}, token, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  if (!/^[A-Za-z0-9_./-]+$/.test(String(path))) throw new Error('Invalid WhatsApp Graph path');
  const url = new URL(`${GRAPH_ORIGIN}/${config().version}/${String(path).replace(/^\/+/, '')}`);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  if (token) {
    query.set('access_token', token);
    query.set('appsecret_proof', appSecretProof(token));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init = { method, redirect: 'error', signal: controller.signal, headers: { Accept: 'application/json' } };
    if (method === 'GET' || method === 'DELETE') url.search = query.toString();
    else {
      init.body = query;
      init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.error) throw graphError(response.status, body);
    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw Object.assign(new Error('WhatsApp did not respond in time; please retry'), { code: 'WHATSAPP_TIMEOUT' });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
function normalizePhone(value) {
  const phone = clean(value).replace(/[\s().-]/g, '');
  if (!/^\+?[1-9]\d{7,14}$/.test(phone)) throw Object.assign(new Error('Recipient phone must include country code'), { status: 400 });
  return phone.replace(/^\+/, '');
}
async function accountRow(userId, accountId) {
  const row = (await pool.query(
    'SELECT * FROM whatsapp_business_accounts WHERE id=$1 AND owner_user_id=$2 AND status=\'active\'',
    [Number(accountId), userId]
  )).rows[0];
  if (!row) throw Object.assign(new Error('WhatsApp account not found'), { status: 404 });
  return row;
}
async function upsertAccount({ userId, businessAccountId, phoneNumberId, accessToken, displayPhoneNumber = '', verifiedName = '' }) {
  const missing = missingConfig();
  if (missing.length) throw Object.assign(new Error('WhatsApp Cloud API is not configured'), { code: 'WHATSAPP_NOT_CONFIGURED', missing });
  if (!/^\d{5,30}$/.test(clean(businessAccountId)) || !/^\d{5,30}$/.test(clean(phoneNumberId))) {
    throw Object.assign(new Error('Business Account ID and Phone Number ID are required'), { status: 400 });
  }
  if (clean(accessToken).length < 20) throw Object.assign(new Error('A valid WhatsApp access token is required'), { status: 400 });
  const token = clean(accessToken);
  const number = await graphRequest(phoneNumberId, { params: { fields: 'id,display_phone_number,verified_name,quality_rating' }, token });
  await graphRequest(businessAccountId, { params: { fields: 'id,name' }, token });
  const row = (await pool.query(
    `INSERT INTO whatsapp_business_accounts(owner_user_id,business_account_id,phone_number_id,display_phone_number,verified_name,access_token_encrypted)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(owner_user_id,phone_number_id) DO UPDATE SET
       business_account_id=EXCLUDED.business_account_id,
       display_phone_number=EXCLUDED.display_phone_number,
       verified_name=EXCLUDED.verified_name,
       access_token_encrypted=EXCLUDED.access_token_encrypted,
       status='active',
       updated_at=CURRENT_TIMESTAMP
     RETURNING id,business_account_id,phone_number_id,display_phone_number,verified_name,status,created_at,updated_at`,
    [userId, clean(businessAccountId), clean(phoneNumberId), clean(number.display_phone_number || displayPhoneNumber).slice(0, 32), clean(number.verified_name || verifiedName).slice(0, 160), encryptToken(token)]
  )).rows[0];
  return row;
}
async function listAccounts(userId) {
  return (await pool.query(
    'SELECT id,business_account_id,phone_number_id,display_phone_number,verified_name,status,created_at,updated_at FROM whatsapp_business_accounts WHERE owner_user_id=$1 AND status=\'active\' ORDER BY updated_at DESC',
    [userId]
  )).rows;
}
async function sendMessage({ userId, accountId, to, text, template, idempotencyKey = null }) {
  const account = await accountRow(userId, accountId);
  const recipient = normalizePhone(to);
  if ((!text && !template) || (text && template)) throw Object.assign(new Error('Provide either text or template'), { status: 400 });
  const body = template
    ? { messaging_product: 'whatsapp', recipient_type: 'individual', to: recipient, type: 'template', template }
    : { messaging_product: 'whatsapp', recipient_type: 'individual', to: recipient, type: 'text', text: { preview_url: false, body: clean(text).slice(0, 4096) } };
  if (body.type === 'text' && !body.text.body) throw Object.assign(new Error('Message text is required'), { status: 400 });
  const key = clean(idempotencyKey).slice(0, 128) || null;
  if (key) {
    const existing = (await pool.query(
      'SELECT id,meta_message_id,status FROM whatsapp_cloud_messages WHERE owner_user_id=$1 AND idempotency_key=$2',
      [userId, key]
    )).rows[0];
    if (existing) return { ...existing, duplicate: true };
  }
  try {
    const result = await graphRequest(`${account.phone_number_id}/messages`, { method: 'POST', params: { ...body }, token: decryptToken(account.access_token_encrypted) });
    const messageId = clean(result.messages?.[0]?.id) || null;
    const row = (await pool.query(
      `INSERT INTO whatsapp_cloud_messages(account_id,owner_user_id,recipient_phone,message_type,payload,meta_message_id,status,idempotency_key)
       VALUES($1,$2,$3,$4,$5,$6,'submitted',$7)
       RETURNING id,recipient_phone,message_type,meta_message_id,status,created_at`,
      [account.id, userId, recipient, body.type, JSON.stringify(body), messageId, key]
    )).rows[0];
    return row;
  } catch (error) {
    await pool.query(
      `INSERT INTO whatsapp_cloud_messages(account_id,owner_user_id,recipient_phone,message_type,payload,status,error_message,idempotency_key)
       VALUES($1,$2,$3,$4,$5,'failed',$6,$7)
      ON CONFLICT DO NOTHING`,
      [account.id, userId, recipient, body.type, JSON.stringify(body), clean(error.message).slice(0, 500), key]
    );
    throw error;
  }
}
function verifyWebhook({ rawBody, signature }) {
  const secret = config().appSecret;
  const match = /^sha256=([0-9a-f]{64})$/i.exec(clean(signature));
  if (!secret || !match || !Buffer.isBuffer(rawBody)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  const supplied = Buffer.from(match[1], 'hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}
function verifySubscription({ mode, token, challenge }) {
  if (mode !== 'subscribe' || !config().verifyToken || clean(token) !== config().verifyToken) return null;
  return clean(challenge);
}
async function handleWebhook({ rawBody, signature }) {
  if (!verifyWebhook({ rawBody, signature })) throw Object.assign(new Error('Invalid WhatsApp webhook signature'), { status: 401 });
  const body = JSON.parse(rawBody.toString('utf8'));
  if (body.object !== 'whatsapp_business_account') throw Object.assign(new Error('Unexpected WhatsApp webhook object'), { status: 400 });
  const changes = [];
  for (const entry of Array.isArray(body.entry) ? body.entry : []) {
    for (const change of Array.isArray(entry.changes) ? entry.changes : []) changes.push({
      field: clean(change.field), value: change.value || {}
    });
  }
  return { accepted: changes.length };
}
async function disconnect({ userId, accountId }) {
  const result = await pool.query(
    `UPDATE whatsapp_business_accounts SET status='revoked',updated_at=CURRENT_TIMESTAMP
     WHERE id=$1 AND owner_user_id=$2 AND status='active' RETURNING id`,
    [Number(accountId), userId]
  );
  if (!result.rows[0]) throw Object.assign(new Error('WhatsApp account not found'), { status: 404 });
  return { disconnected: true };
}
module.exports = { config, missingConfig, upsertAccount, listAccounts, sendMessage, disconnect, verifySubscription, handleWebhook };
