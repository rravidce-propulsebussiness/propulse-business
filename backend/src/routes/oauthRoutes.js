/**
 * Single-client OAuth2 authorization-code provider for Business OS.
 * Exact callback, confidential client, mandatory S256 PKCE, verified email,
 * one-time hashed short-lived grants; no legacy JWTs or roles sent to caller.
 */
const express = require('express');
const crypto = require('crypto');
const pool = require('../config/database');
const authService = require('../services/authService');
const rateLimit = require('../middleware/rateLimitMiddleware');
const router = express.Router();

const clientId = () => String(process.env.PROPULSE_OAUTH_CLIENT_ID || '').trim();
const clientSecret = () => String(process.env.PROPULSE_OAUTH_CLIENT_SECRET || '').trim();
const redirectUri = () => String(process.env.PROPULSE_OAUTH_REDIRECT_URI || '').trim();
const enabled = () => process.env.PROPULSE_OAUTH_ENABLED === 'true'
  && clientId().length >= 12 && clientSecret().length >= 32
  && /^https:\/\/[a-z0-9-]+\.supabase\.co\/auth\/v1\/callback$/.test(redirectUri());
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const random = () => crypto.randomBytes(32).toString('base64url');
const validToken = v => typeof v === 'string' && /^[A-Za-z0-9_-]{36,128}$/.test(v);
const validChallenge = v => typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v);
function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}
function oauthError(res, status, code) {
  noStore(res);
  return res.status(status).json({ error: code });
}
function secureEquals(actual, expected) {
  if (typeof actual !== 'string' || !expected) return false;
  return crypto.timingSafeEqual(Buffer.from(hash(actual), 'hex'), Buffer.from(hash(expected), 'hex'));
}
// Return only fixed, non-sensitive reason codes. Never include client secrets,
// configured callback values, session cookies, tokens or raw request data.
function authorizeValidation(params) {
  if (!enabled()) return { params: null, reason: 'provider_not_ready' };
  const q = Object.fromEntries(
    ['client_id','redirect_uri','response_type','state','code_challenge','code_challenge_method','scope']
      .map(key => [key, String(params[key] || '')]),
  );
  if (q.client_id !== clientId()) return { params: null, reason: 'client_id_mismatch' };
  if (q.redirect_uri !== redirectUri()) return { params: null, reason: 'redirect_uri_mismatch' };
  if (q.response_type !== 'code') return { params: null, reason: 'unsupported_response_type' };
  if (q.code_challenge_method !== 'S256' || !validChallenge(q.code_challenge)) {
    return { params: null, reason: 'invalid_pkce_challenge' };
  }
  if (!/^[A-Za-z0-9_.~+/-]{16,2048}$/.test(q.state)) {
    return { params: null, reason: 'invalid_state' };
  }
  if (q.scope.length > 200 || q.scope.split(' ').some(s => s && !['openid','profile','email'].includes(s))) {
    return { params: null, reason: 'invalid_scope' };
  }
  return { params: q, reason: null };
}
function validatedAuthorizeParams(params) {
  return authorizeValidation(params).params;
}
function cookieUser(req) {
  const found = String(req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('propulse_auth='));
  if (!found) return null;
  try { return authService.verifyToken(decodeURIComponent(found.slice('propulse_auth='.length))); }
  catch { return null; }
}
function consentSignature(params, principal, issued) {
  const payload = JSON.stringify([params.client_id,params.redirect_uri,params.state,
    params.code_challenge,params.code_challenge_method,params.scope,String(principal.id),
    String(principal.auth_version),issued]);
  return crypto.createHmac('sha256',clientSecret()).update(payload).digest('hex');
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  })[ch]);
}
function consentPage(params, principal) {
  const issued=String(Date.now());
  const signature=consentSignature(params,principal,issued);
  const fields=Object.entries(params).map(([key,value]) =>
    '<input type="hidden" name="'+escapeHtml(key)+'" value="'+escapeHtml(value)+'">',
  ).join('');
  const approval='<input type="hidden" name="approval" value="'+issued+'.'+signature+'">';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Connect ProPulse to Business OS</title></head>' +
    '<body style="margin:0;background:#f1f5ff;color:#14213f;font:16px system-ui">' +
    '<main style="max-width:500px;margin:10vh auto;padding:35px;border-radius:16px;background:#fff;' +
    'box-shadow:0 20px 50px #13234220">' +
    '<h1 style="font-size:27px">Continue to ProPulse Business OS?</h1>' +
    '<p>Share your verified ProPulse email and display name to sign in. ' +
    'This does not grant Business OS company permissions.</p>' +
    '<p style="padding:12px;background:#edf4ff;border-radius:8px">' +
    escapeHtml(principal.email)+'</p>' +
    '<form method="post" action="/api/oauth/authorize">' + fields + approval +
    '<button type="submit" style="width:100%;padding:14px;border:0;border-radius:8px;' +
    'color:#fff;background:#176def;font-weight:700;cursor:pointer">' +
    'Approve and continue</button></form>' +
    '<p><a href="https://sghomesinterior.in/login">Cancel</a></p></main></body></html>';
}
async function authorize(req,res) {
  noStore(res);
  res.setHeader('X-Frame-Options','DENY');
  // Chromium enforces form-action across the whole OAuth POST redirect
  // chain, including Supabase's failure redirect destinations. Its violation
  // message misleadingly names the original same-origin POST endpoint even
  // when the browser blocked a later redirect. Do not set form-action on
  // this one trusted, script-free, server-rendered consent document.
  // All other CSP controls remain active. The POST is protected separately
  // by strict CORS/Origin and CSRF checks, a HMAC-signed consent token, PKCE,
  // verified user identity, and an exact callback URL.
  res.setHeader('Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; style-src 'unsafe-inline'");
  const { params, reason }=authorizeValidation(req.method==='POST'?req.body:req.query);
  if (!params) {
    // Safe diagnostics for Hostinger runtime logs, and useful to users seeing a 400.
    // The provider_not_ready reason deliberately does not expose which secret/flag is missing.
    console.warn('ProPulse OAuth authorize rejected:',reason);
    noStore(res);
    return res.status(400).json({error:'invalid_request',reason});
  }
  const principal=cookieUser(req);
  if (!principal) {
    if (req.method==='POST') return oauthError(res,401,'login_required');
    const returnTo='/api/oauth/authorize?'+new URLSearchParams(params).toString();
    return res.redirect(303,'/login?returnTo='+encodeURIComponent(returnTo));
  }
  try {
    const record=(await pool.query(
      'SELECT id,email,name,auth_version,email_verified_at FROM users WHERE id=$1 AND is_active=TRUE',
      [principal.id],
    )).rows[0];
    if (!record || Number(record.auth_version||0)!==Number(principal.auth_version||0))
      return oauthError(res,401,'login_required');
    if (!record.email_verified_at) return res.status(403).type('html').send(
      '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Verify ProPulse email</title><main style="max-width:550px;margin:12vh auto;padding:32px;font-family:system-ui">' +
      '<h1>Verify your email first</h1><p>To protect your Business OS account, prove ownership of your ProPulse email ' +
      'using our dedicated verification link, or sign in with a verified Google account.</p>' +
      '<a href="/api/auth/email-verification">Send me a verification email</a></main></html>',
    );

    if(req.method!=='POST') {
      // The OAuth consent page contains a same-origin HTML form POST. Keeping
      // Referrer-Policy: no-referrer here makes Chrome send Origin: null on
      // navigation-mode form submissions, which our strict CORS layer rejects.
      // strict-origin sends only the HTTPS site origin (never URL/query values)
      // and does not permit HTTPS referrers to downgrade to insecure HTTP.
      res.setHeader('Referrer-Policy','strict-origin');
      return res.status(200).type('html').send(consentPage(params,record));
    }

    const approval=String(req.body?.approval||'');
    const [issued,signature,extra]=approval.split('.');
    const timestamp=Number(issued);
    if (extra!==undefined || !/^\d{13}$/.test(issued||'') ||
        !/^[0-9a-f]{64}$/.test(signature||'') ||
        !Number.isSafeInteger(timestamp) || timestamp>Date.now()+30000 ||
        Date.now()-timestamp>5*60*1000 ||
        !secureEquals(signature,consentSignature(params,record,issued))) {
      return oauthError(res,403,'access_denied');
    }
    const code=random();
    await pool.query(
      'INSERT INTO propulse_oauth_authorization_codes ' +
      '(code_hash,user_id,client_id,redirect_uri,code_challenge,auth_version,expires_at) ' +
      "VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP + INTERVAL '3 minutes')",
      [hash(code),record.id,params.client_id,params.redirect_uri,params.code_challenge,record.auth_version],
    );
    const dest=new URL(params.redirect_uri);
    dest.searchParams.set('code',code);
    dest.searchParams.set('state',params.state);
    return res.redirect(303,dest.toString());
  } catch(e) {
    console.error('ProPulse OAuth authorize failed:',e.message);
    return oauthError(res,503,'temporarily_unavailable');
  }
}
router.get('/authorize',rateLimit({windowMs:60000,max:40}),authorize);
router.post('/authorize',express.urlencoded({extended:false,limit:'8kb'}),
  rateLimit({windowMs:60000,max:20}),authorize);
router.post('/token', express.urlencoded({extended:false,limit:'8kb'}), rateLimit({windowMs:60000,max:40}), async (req,res) => {
  noStore(res);
  if (!enabled()) return oauthError(res,503,'temporarily_unavailable');
  let suppliedClient=String(req.body?.client_id||'');
  let suppliedSecret=String(req.body?.client_secret||'');
  const header=String(req.headers.authorization||'');
  if (header.startsWith('Basic ')) {
    try {
      const raw=Buffer.from(header.slice(6),'base64').toString('utf8');
      const position=raw.indexOf(':');
      if (position<1) return oauthError(res,401,'invalid_client');
      suppliedClient=decodeURIComponent(raw.slice(0,position));
      suppliedSecret=decodeURIComponent(raw.slice(position+1));
    } catch { return oauthError(res,401,'invalid_client'); }
  }
  if (!secureEquals(suppliedClient,clientId()) || !secureEquals(suppliedSecret,clientSecret())) {
    res.setHeader('WWW-Authenticate','Basic realm="ProPulse OAuth"');
    return oauthError(res,401,'invalid_client');
  }
  const {grant_type,code,redirect_uri,code_verifier}=req.body||{};
  if (grant_type!=='authorization_code' || !validToken(code) || redirect_uri!==redirectUri() ||
      !validToken(code_verifier)) return oauthError(res,400,'invalid_grant');
  try {
    // DELETE RETURNING consumes a grant once, even across multiple servers.
    const record=(await pool.query(
      'DELETE FROM propulse_oauth_authorization_codes ' +
      'WHERE code_hash=$1 AND client_id=$2 AND redirect_uri=$3 ' +
      'RETURNING user_id,code_challenge,auth_version,expires_at',
      [hash(code),clientId(),redirectUri()],
    )).rows[0];
    if (!record || Date.parse(record.expires_at)<=Date.now()) return oauthError(res,400,'invalid_grant');
    const computed=crypto.createHash('sha256').update(code_verifier).digest('base64url');
    if (!secureEquals(computed,record.code_challenge)) return oauthError(res,400,'invalid_grant');
    const user=(await pool.query(
      'SELECT id FROM users WHERE id=$1 AND is_active=TRUE ' +
      'AND email_verified_at IS NOT NULL AND auth_version=$2',
      [record.user_id,record.auth_version],
    )).rows[0];
    if (!user) return oauthError(res,400,'invalid_grant');
    const token=random();
    await pool.query(
      'INSERT INTO propulse_oauth_access_tokens (token_hash,user_id,client_id,auth_version,expires_at) ' +
      "VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP + INTERVAL '5 minutes')",
      [hash(token),user.id,clientId(),record.auth_version],
    );
    return res.json({access_token:token,token_type:'Bearer',expires_in:300,scope:'openid email profile'});
  } catch(e) {
    console.error('ProPulse OAuth token failed:',e.message);
    return oauthError(res,503,'temporarily_unavailable');
  }
});
router.get('/userinfo', rateLimit({windowMs:60000,max:80}), async(req,res)=>{
  noStore(res);
  const auth=String(req.headers.authorization||'');
  const token=auth.startsWith('Bearer ')?auth.slice(7).trim():'';
  if (!enabled() || !validToken(token)) return oauthError(res,401,'invalid_token');
  try {
    const user=(await pool.query(
      'SELECT u.id,u.name,u.email FROM propulse_oauth_access_tokens t ' +
      'INNER JOIN users u ON u.id=t.user_id WHERE t.token_hash=$1 AND t.client_id=$2 ' +
      'AND t.expires_at>CURRENT_TIMESTAMP AND u.is_active=TRUE ' +
      'AND u.email_verified_at IS NOT NULL AND u.auth_version=t.auth_version',
      [hash(token),clientId()],
    )).rows[0];
    if (!user) return oauthError(res,401,'invalid_token');
    return res.json({
      sub:'propulse:'+String(user.id),
      id:'propulse:'+String(user.id),
      email:user.email,
      email_verified:true,
      name:user.name,
      preferred_username:user.name,
    });
  } catch(e) {
    console.error('ProPulse OAuth userinfo failed:',e.message);
    return oauthError(res,503,'temporarily_unavailable');
  }
});
module.exports={router,validatedAuthorizeParams,secureEquals};
