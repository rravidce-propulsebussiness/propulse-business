const { Pool } = require('pg');
require('dotenv').config();

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
let parsedDatabaseUrl = null;
let poolConnectionString = databaseUrl;

if(databaseUrl&&/(YOUR_|\[YOUR|CHANGE_ME|PLACEHOLDER)/i.test(databaseUrl)){
  const error=new Error('DATABASE_URL still contains an example placeholder');
  error.code='DATABASE_URL_PLACEHOLDER';
  throw error;
}
if(databaseUrl){
  try{
    parsedDatabaseUrl=new URL(databaseUrl);
    if(!['postgres:','postgresql:'].includes(parsedDatabaseUrl.protocol)||!parsedDatabaseUrl.hostname||!parsedDatabaseUrl.username||!parsedDatabaseUrl.pathname||parsedDatabaseUrl.pathname==='/'){
      const error=new Error('DATABASE_URL is not a complete PostgreSQL URL');
      error.code='DATABASE_URL_INVALID';
      throw error;
    }

    // node-postgres can derive its own TLS object from sslmode query parameters.
    // We manage TLS explicitly below so hosting-specific certificate behavior is
    // deterministic and cannot override the configured CA/reject policy.
    const normalized=new URL(databaseUrl);
    for(const key of ['sslmode','sslcert','sslkey','sslrootcert']) normalized.searchParams.delete(key);
    poolConnectionString=normalized.toString();
  }catch(error){
    if(error?.code)throw error;
    const wrapped=new Error('DATABASE_URL is not a valid PostgreSQL connection URL');
    wrapped.code='DATABASE_URL_INVALID';
    throw wrapped;
  }
}

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
if (process.env.NODE_ENV === 'production' && !databaseUrl) {
  const missing = required.filter(key => !String(process.env[key] || '').trim());
  if (missing.length) throw new Error(`Missing database configuration: set DATABASE_URL or provide ${missing.join(', ')}`);
}

const configuredPoolMax = Number(process.env.DB_POOL_MAX);
const poolMax = Number.isFinite(configuredPoolMax) && configuredPoolMax > 0
  ? Math.min(10, Math.max(2, configuredPoolMax))
  : 5;

const databaseHost=String(parsedDatabaseUrl?.hostname||process.env.DB_HOST||'').trim().toLowerCase();
const isSupabasePooler=/\.pooler\.supabase\.com$/i.test(databaseHost);
const requestedSslMode=String(parsedDatabaseUrl?.searchParams.get('sslmode')||'').trim().toLowerCase();
const dbSslExplicit=/^(1|true|require|verify-ca|verify-full)$/i.test(String(process.env.DB_SSL||'').trim());
const dbSslEnabled=isSupabasePooler||dbSslExplicit||['require','verify-ca','verify-full'].includes(requestedSslMode);
const rejectUnauthorizedRequested=!/^(0|false)$/i.test(String(process.env.DB_SSL_REJECT_UNAUTHORIZED||'').trim());

const caBase64=String(process.env.DB_SSL_CA_BASE64||'').trim();
let dbSslCa=null;
if(caBase64){
  try{
    dbSslCa=Buffer.from(caBase64,'base64').toString('utf8').trim();
    if(!dbSslCa.includes('-----BEGIN CERTIFICATE-----')||!dbSslCa.includes('-----END CERTIFICATE-----')){
      throw new Error('Certificate PEM markers are missing');
    }
  }catch(error){
    const wrapped=new Error('DB_SSL_CA_BASE64 is not a valid base64-encoded PEM certificate');
    wrapped.code='DB_SSL_CA_INVALID';
    throw wrapped;
  }
}

// Supabase documents PostgreSQL sslmode=require as encrypted TLS without CA
// verification. Managed hosts can otherwise fail with SELF_SIGNED_CERT_IN_CHAIN
// against the shared pooler. When the Supabase CA is supplied we automatically
// restore strict certificate verification.
const dbSslRejectUnauthorized=dbSslCa
  ? true
  : (isSupabasePooler ? false : rejectUnauthorizedRequested);

if(process.env.NODE_ENV==='production'&&isSupabasePooler&&dbSslEnabled&&!dbSslCa&&rejectUnauthorizedRequested){
  console.warn('Supabase pooler TLS is encrypted in require mode; set DB_SSL_CA_BASE64 to enable CA verification.');
}

const pool = new Pool({
  ...(databaseUrl
    ? { connectionString: poolConnectionString }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }),
  max: poolMax,
  idleTimeoutMillis: Math.max(1000, Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000),
  connectionTimeoutMillis: Math.max(1000, Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 10000),
  statement_timeout: Math.max(1000, Number(process.env.DB_STATEMENT_TIMEOUT_MS) || 30000),
  idle_in_transaction_session_timeout: Math.max(1000, Number(process.env.DB_IDLE_IN_TX_TIMEOUT_MS) || 60000),
  application_name: process.env.DB_APPLICATION_NAME || 'propulse-backend',
  ssl: dbSslEnabled ? {
    rejectUnauthorized: dbSslRejectUnauthorized,
    ...(dbSslCa ? { ca: dbSslCa } : {}),
  } : false,
});

pool.on('error', error => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

module.exports = pool;
