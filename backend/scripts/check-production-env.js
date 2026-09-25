require('dotenv').config({ quiet: true });

const errors = [];
const warnings = [];

const value = key => String(process.env[key] || '').trim();
const fail = message => errors.push(message);
const warn = message => warnings.push(message);

function parseOrigin(raw, key) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') fail(`${key} must use https:// in production`);
    if (url.username || url.password) fail(`${key} must not contain credentials`);
    if (url.pathname !== '/' || url.search || url.hash) fail(`${key} must be an origin only (no path, query, or fragment)`);
    return url.origin;
  } catch {
    fail(`${key} is not a valid URL origin`);
    return null;
  }
}

if (value('NODE_ENV') !== 'production') fail('NODE_ENV must be production (this command is intended for the deployed staging/production environment, not your normal local development .env)');

for (const key of ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) {
  if (!value(key)) fail(`${key} is required`);
}

const dbPort = Number(value('DB_PORT'));
if (value('DB_PORT') && (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535)) fail('DB_PORT must be a valid TCP port');

const jwtSecret = value('JWT_SECRET');
if (jwtSecret.length < 32) fail('JWT_SECRET must be at least 32 characters');
if (/replace|change-this|secret-in-development/i.test(jwtSecret)) fail('JWT_SECRET still looks like an example/development value');

const originValues = value('CORS_ORIGIN').split(',').map(item => item.trim()).filter(Boolean);
if (!originValues.length) fail('CORS_ORIGIN is required');
if (originValues.includes('*')) fail('CORS_ORIGIN must never use * with credentialed cookies');
const origins = originValues.map(origin => parseOrigin(origin, 'CORS_ORIGIN')).filter(Boolean);

const publicApp = value('PUBLIC_APP_URL');
if (!publicApp) fail('PUBLIC_APP_URL is required');
const publicOrigin = publicApp ? parseOrigin(publicApp, 'PUBLIC_APP_URL') : null;
if (publicOrigin && origins.length && !origins.includes(publicOrigin)) fail('PUBLIC_APP_URL must also be present in CORS_ORIGIN');

const trustProxy = value('TRUST_PROXY');
if (/^true$/i.test(trustProxy)) fail('TRUST_PROXY=true is too broad for production; configure a trusted hop count/address or false');
if (!trustProxy) warn('TRUST_PROXY is empty; use false for direct connections or configure the actual trusted proxy');

const dbHost = value('DB_HOST').toLowerCase();
const localDb = ['localhost', '127.0.0.1', '::1'].includes(dbHost);
const dbSsl = /^(1|true|require)$/i.test(value('DB_SSL'));
if (!localDb && !dbSsl) warn('DB_SSL is disabled for a non-local database host; verify the database is reached only over a trusted private network');

const resendKey = value('RESEND_API_KEY');
const resendFrom = value('RESEND_FROM_EMAIL');
if (Boolean(resendKey) !== Boolean(resendFrom)) fail('RESEND_API_KEY and RESEND_FROM_EMAIL must be configured together');
if (!resendKey) warn('Password-reset email delivery is not configured (RESEND_API_KEY/RESEND_FROM_EMAIL missing)');

if (!value('GOOGLE_CLIENT_ID')) warn('Google sign-in is not configured (GOOGLE_CLIENT_ID missing)');

if (value('ADMIN_PASSWORD')) warn('ADMIN_PASSWORD is present in the long-running environment; remove bootstrap admin credentials after creating the admin account');

if (errors.length) {
  console.error('Production environment check failed:');
  errors.forEach(item => console.error(` - ${item}`));
  if (warnings.length) {
    console.error('Warnings:');
    warnings.forEach(item => console.error(` - ${item}`));
  }
  process.exit(1);
}

console.log('Production environment check passed.');
if (warnings.length) {
  console.log('Warnings:');
  warnings.forEach(item => console.log(` - ${item}`));
}
