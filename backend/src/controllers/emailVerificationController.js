const crypto = require('crypto');
const pool = require('../config/database');
const { sendEmailVerificationEmail } = require('../services/emailService');

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const validToken = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

function headers(res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; style-src 'unsafe-inline'");
}
function esc(text) {
  return String(text).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function document(res, title, message, form = '') {
  headers(res);
  return res.type('html').send('<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>'+esc(title)+' — ProPulse</title></head>' +
    '<body style="margin:0;background:#f2f6ff;color:#152346;font:16px system-ui">' +
    '<main style="max-width:550px;margin:12vh auto;padding:35px;border-radius:16px;background:white;' +
    'border:1px solid #e1e9f7;box-shadow:0 14px 50px #19335e18">' +
    '<p style="font-size:12px;color:#1768ea;font-weight:800">PROPULSE BUSINESS</p>' +
    '<h1 style="font-size:27px">'+esc(title)+'</h1><p style="line-height:1.65">'+esc(message)+'</p>' +
    form+'<p style="font-size:13px"><a href="https://sghomesinterior.in/login">Back to Business OS</a></p>' +
    '</main></body></html>');
}
function form(action, button, token = '') {
  return '<form method="post" action="'+action+'" style="margin:24px 0">' +
    (token ? '<input type="hidden" name="token" value="'+esc(token)+'">' : '') +
    '<button style="width:100%;padding:14px;border:0;border-radius:9px;color:white;' +
    'font-weight:700;background:#176afa;cursor:pointer" type="submit">'+esc(button)+'</button></form>';
}
function siteOrigin() {
  const raw = process.env.PROPULSE_SITE_ORIGIN || 'https://propulsetechnologies.online';
  const url = new URL(raw);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Invalid PROPULSE_SITE_ORIGIN');
  }
  if (process.env.NODE_ENV === 'production' &&
      (url.protocol !== 'https:' || url.hostname !== 'propulsetechnologies.online')) {
    throw new Error('Production email verification origin must match ProPulse');
  }
  return url.origin;
}

async function showRequest(_req, res) {
  return document(res, 'Verify your email',
    'Confirm the email address on your signed-in ProPulse account. We will send a private verification link that expires in 30 minutes. You will not need to change your password.',
    form('/api/auth/email-verification/request','Send verification email'));
}

async function request(req, res) {
  headers(res);
  let tokenHash = null;
  try {
    const user = (await pool.query(
      'SELECT id,name,email,auth_version,email_verified_at FROM users WHERE id=$1 AND is_active=TRUE',
      [req.user.id],
    )).rows[0];
    if (!user) return document(res,'Session expired','Please sign in again to ProPulse.');
    if (user.email_verified_at) return document(res,'Email already verified',
      'You can now return to Business OS and select Continue with ProPulse.');

    const token = crypto.randomBytes(32).toString('base64url');
    tokenHash = hash(token);
    await pool.query('DELETE FROM propulse_email_verification_tokens WHERE user_id=$1 OR expires_at<CURRENT_TIMESTAMP',[user.id]);
    await pool.query(
      'INSERT INTO propulse_email_verification_tokens (token_hash,user_id,email_address,auth_version,expires_at) ' +
      "VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP + INTERVAL '30 minutes')",
      [tokenHash,user.id,String(user.email).trim().toLowerCase(),user.auth_version],
    );
    const url = new URL('/api/auth/email-verification/confirm',siteOrigin());
    url.searchParams.set('token',token);
    await sendEmailVerificationEmail({to:user.email,name:user.name,verificationUrl:url.toString()});
    return document(res,'Check your inbox',
      'We sent an email verification link to your ProPulse email address. Check your inbox and spam folder. The link expires in 30 minutes.');
  } catch (e) {
    if (tokenHash) await pool.query(
      'DELETE FROM propulse_email_verification_tokens WHERE token_hash=$1',[tokenHash],
    ).catch(()=>{});
    console.error('Email verification request failed:',e.code || e.message);
    return res.status(503).type('html').send('<h1>Verification email unavailable</h1><p>Please try again later.</p>');
  }
}

async function showConfirm(req, res) {
  const token = String(req.query.token || '');
  if (!validToken(token)) return document(res,'Invalid verification link',
    'The email link is invalid. Request a new verification email from your ProPulse account.');
  return document(res,'Confirm your email',
    'Click the button below to confirm your email address. This action will not change your password.',
    form('/api/auth/email-verification/confirm','Verify my email',token));
}

async function confirm(req, res) {
  const token = String(req.body?.token || '');
  if (!validToken(token)) {
    res.status(400);
    return document(res,'Invalid verification link','Request a new verification email from ProPulse.');
  }
  try {
    // Single statement ensures one-time, expiring tokens and correct email,
    // account state and session version are checked together.
    const result = await pool.query(
      'WITH consumed AS (' +
      ' DELETE FROM propulse_email_verification_tokens ' +
      ' WHERE token_hash=$1 AND expires_at>CURRENT_TIMESTAMP ' +
      ' RETURNING user_id,email_address,auth_version' +
      ') UPDATE users u SET email_verified_at=COALESCE(u.email_verified_at,CURRENT_TIMESTAMP),' +
      ' updated_at=CURRENT_TIMESTAMP FROM consumed c WHERE u.id=c.user_id ' +
      ' AND u.is_active=TRUE AND LOWER(u.email)=c.email_address ' +
      ' AND u.auth_version=c.auth_version RETURNING u.id',
      [hash(token)],
    );
    if (!result.rows.length) {
      res.status(400);
      return document(res,'Link expired or already used',
        'Your verification link is invalid or expired. Sign in to ProPulse to request another.');
    }
    return document(res,'Your email is verified',
      'Your email was verified successfully. You can return to Business OS and select Continue with ProPulse.');
  } catch (e) {
    console.error('Email verification confirmation failed:',e.code || e.message);
    res.status(503);
    return document(res,'Try again later','Email verification is temporarily unavailable.');
  }
}

module.exports = {showRequest,request,showConfirm,confirm,siteOrigin};
