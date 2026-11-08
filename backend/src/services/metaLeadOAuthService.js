const crypto = require('node:crypto');
const meta = require('./metaLeadService');

// Temporary, HttpOnly cookies keep the Facebook user token off the browser's JavaScript.
// They are encrypted using the existing Meta Leads AES-256-GCM key.
const STATE_COOKIE = 'propulse_meta_oauth_state';
const SESSION_COOKIE = 'propulse_meta_oauth_session';
const STATE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 10 * 60 * 1000;
const REDIRECT_URI = 'https://propulsetechnologies.online/api/meta-leads/oauth/callback';
const SCOPES = 'pages_show_list,pages_manage_metadata,leads_retrieval,pages_read_engagement';
const error = (message, code) => Object.assign(new Error(message), {code});

function verifyConfig() {
  const appId = String(process.env.META_LEADS_APP_ID || '').trim();
  if (!/^\d{5,32}$/.test(appId) || !process.env.META_LEADS_APP_SECRET ||
      !process.env.META_LEADS_VERIFY_TOKEN) {
    throw error('Facebook Page linking requires Meta App ID and webhook configuration', 'META_NOT_CONFIGURED');
  }
  // Fail before redirecting to Facebook when the encryption key is missing.
  meta.encrypt('configuration-check');
  return appId;
}
function getCookie(req, name) {
  const raw = String(req.headers.cookie || '').split(';').map(part => part.trim())
    .find(part => part.startsWith(name + '='));
  return raw ? raw.slice(name.length + 1) : '';
}
function setCookie(res, name, value, ageSeconds) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append('Set-Cookie', name + '=' + value + '; Path=/api/meta-leads/oauth; HttpOnly; SameSite=Lax' +
    secure + '; Max-Age=' + ageSeconds);
}
function clearCookie(res, name) { setCookie(res, name, '', 0); }
function encode(payload) { return meta.encrypt(JSON.stringify(payload)); }
function decode(value) {
  try { return JSON.parse(meta.decrypt(value)); }
  catch { return null; }
}
function currentCookie(req, name, maxAge) {
  const value = getCookie(req, name);
  const data = value && decode(value);
  if (!data || !Number.isInteger(data.issuedAt) || data.issuedAt > Date.now() + 30000 ||
      Date.now() - data.issuedAt > maxAge || !Number.isSafeInteger(Number(data.userId)) ||
      !['admin','lead_partner'].includes(data.role)) {
    return null;
  }
  return data;
}
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function home(role) { return role === 'lead_partner' ? '/lead-partner/meta-leads' : '/admin/leads/meta'; }
function returnError(res, role, reason) {
  return res.redirect(303, home(role) + '?metaConnect=' + encodeURIComponent(reason));
}

async function start(user, res) {
  verifyConfig();
  await meta.checkUser(user);
  clearCookie(res, SESSION_COOKIE);
  const state = crypto.randomBytes(32).toString('base64url');
  setCookie(res, STATE_COOKIE, encode({
    issuedAt: Date.now(), userId: user.id, role: user.role, state
  }), Math.ceil(STATE_TTL_MS / 1000));
  const url = new URL('https://www.facebook.com/' +
    (/^v\d{1,2}\.\d{1,2}$/.test(process.env.META_LEADS_GRAPH_VERSION || '') ?
      process.env.META_LEADS_GRAPH_VERSION : 'v25.0') + '/dialog/oauth');
  url.searchParams.set('client_id', process.env.META_LEADS_APP_ID.trim());
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  const configId = String(process.env.META_LEADS_LOGIN_CONFIG_ID || '').trim();
  if (configId) {
    if (!/^\d{5,32}$/.test(configId)) throw error('Invalid Meta Business Login configuration', 'META_NOT_CONFIGURED');
    url.searchParams.set('config_id', configId);
  } else {
    url.searchParams.set('scope', SCOPES);
  }
  return {authorizationUrl:url.toString()};
}

async function callback(req, res) {
  const state = currentCookie(req, STATE_COOKIE, STATE_TTL_MS);
  clearCookie(res, STATE_COOKIE);
  clearCookie(res, SESSION_COOKIE);
  if (!state || !safeEqual(String(req.query?.state || ''), state.state)) {
    return returnError(res, state?.role, 'state_invalid');
  }
  if (req.query?.error || req.query?.error_reason) return returnError(res, state.role, 'cancelled');
  const code = req.query?.code;
  if (typeof code !== 'string' || code.length < 8 || code.length > 2048)
    return returnError(res, state.role, 'code_invalid');
  try {
    const appId = verifyConfig();
    const first = await meta.graph('oauth/access_token', '', {params:{
      client_id:appId, client_secret:process.env.META_LEADS_APP_SECRET,
      redirect_uri:REDIRECT_URI, code
    }});
    if (typeof first.access_token !== 'string' || !first.access_token)
      return returnError(res, state.role, 'token_exchange_failed');
    // A long-lived user token yields durable Page tokens from /me/accounts.
    const extended = await meta.graph('oauth/access_token', '', {params:{
      grant_type:'fb_exchange_token', client_id:appId,
      client_secret:process.env.META_LEADS_APP_SECRET, fb_exchange_token:first.access_token
    }});
    if (typeof extended.access_token !== 'string' || !extended.access_token)
      return returnError(res, state.role, 'token_exchange_failed');
    setCookie(res, SESSION_COOKIE, encode({
      issuedAt:Date.now(), userId:state.userId, role:state.role,
      token:extended.access_token
    }), Math.ceil(SESSION_TTL_MS / 1000));
    return res.redirect(303, home(state.role) + '?metaConnect=choose_page');
  } catch (e) {
    console.error('Meta OAuth callback failed:', e.code || 'META_OAUTH_FAILED');
    return returnError(res, state.role, 'meta_rejected');
  }
}

async function authorized(user, req) {
  await meta.checkUser(user);
  const session = currentCookie(req, SESSION_COOKIE, SESSION_TTL_MS);
  if (!session || Number(session.userId) !== Number(user.id) || session.role !== user.role ||
      typeof session.token !== 'string' || !session.token.length) {
    throw error('Facebook link session expired. Click Connect Facebook Page again.', 'META_OAUTH_EXPIRED');
  }
  return session;
}
async function fetchPages(token, includeTokens = false) {
  let after, count = 0, pages = [];
  const seen = new Set();
  // Follow only Graph cursors (never arbitrary paging.next URLs).
  while (count++ < 5) {
    const params = {fields:'id,name,access_token,tasks',limit:'100'};
    if (after) params.after = after;
    const result = await meta.graph('me/accounts', token, {params});
    for (const page of Array.isArray(result.data) ? result.data : []) {
      if (!/^\d{5,40}$/.test(String(page.id)) || typeof page.access_token !== 'string' ||
          seen.has(String(page.id))) continue;
      seen.add(String(page.id));
      pages.push(includeTokens ? {
        pageId:String(page.id), pageName:String(page.name || 'Facebook Page').slice(0,255),
        pageAccessToken:page.access_token
      } : {pageId:String(page.id),pageName:String(page.name || 'Facebook Page').slice(0,255)});
    }
    const cursor = result.paging?.cursors?.after;
    if (!result.paging?.next || !cursor || cursor === after) break;
    after = String(cursor).slice(0,1000);
  }
  return pages;
}
async function pages(user, req) {
  const session = await authorized(user, req);
  return {pages:await fetchPages(session.token)};
}
async function complete(user, req, res, pageId) {
  const session = await authorized(user, req);
  if (!/^\d{5,40}$/.test(String(pageId || '')))
    throw error('Choose a Facebook Page from the list.', 'INVALID_META_PAGE');
  const permitted = (await fetchPages(session.token, true)).find(p => p.pageId === String(pageId));
  if (!permitted) throw error('This Page was not authorized in Facebook Login.', 'INVALID_META_PAGE');
  const connection = await meta.connect(user, {
    pageId:permitted.pageId, pageAccessToken:permitted.pageAccessToken
  });
  // Leave the short-lived session available to connect a second authorized Page.
  return {connection};
}
function cancel(res) {
  clearCookie(res, STATE_COOKIE);
  clearCookie(res, SESSION_COOKIE);
  return {cancelled:true};
}
module.exports = {start,callback,pages,complete,cancel,REDIRECT_URI};
