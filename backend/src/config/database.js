const { Pool } = require('pg');
require('dotenv').config();

let databaseUrl = String(process.env.DATABASE_URL || '').trim();
let parsedDatabaseUrl = null;
let poolConnectionString = databaseUrl;

function degradeDatabaseConfig(message,error){
  console.error('[database-config] '+message+(error?.message?': '+error.message:''));
}

if(databaseUrl&&/(YOUR_|\[YOUR|CHANGE_ME|PLACEHOLDER)/i.test(databaseUrl)){
  degradeDatabaseConfig('DATABASE_URL still contains an example placeholder; backend will start in degraded mode');
  databaseUrl='';
  poolConnectionString='';
}

if(databaseUrl){
  try{
    parsedDatabaseUrl=new URL(databaseUrl);
    if(!['postgres:','postgresql:'].includes(parsedDatabaseUrl.protocol)||!parsedDatabaseUrl.hostname||!parsedDatabaseUrl.username||!parsedDatabaseUrl.pathname||parsedDatabaseUrl.pathname==='/'){
      throw new Error('DATABASE_URL is not a complete PostgreSQL URL');
    }

    const normalized=new URL(databaseUrl);
    for(const key of ['sslmode','sslcert','sslkey','sslrootcert']) normalized.searchParams.delete(key);
    poolConnectionString=normalized.toString();
  }catch(error){
    degradeDatabaseConfig('DATABASE_URL is invalid; falling back to DB_* settings',error);
    databaseUrl='';
    parsedDatabaseUrl=null;
    poolConnectionString='';
  }
}

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
if(process.env.NODE_ENV==='production'&&!databaseUrl){
  const missing=required.filter(key=>!String(process.env[key]||'').trim());
  if(missing.length){
    degradeDatabaseConfig('Missing database configuration ('+missing.join(', ')+'); HTTP server will still start and readiness will remain degraded');
  }
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
    const decoded=Buffer.from(caBase64,'base64').toString('utf8').trim();
    if(!decoded.includes('-----BEGIN CERTIFICATE-----')||!decoded.includes('-----END CERTIFICATE-----')){
      throw new Error('Certificate PEM markers are missing');
    }
    dbSslCa=decoded;
  }catch(error){
    degradeDatabaseConfig('DB_SSL_CA_BASE64 is invalid; continuing without the custom CA',error);
    dbSslCa=null;
  }
}

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
        host: String(process.env.DB_HOST||'').trim()||'127.0.0.1',
        port: Number(process.env.DB_PORT) || 5432,
        database: String(process.env.DB_NAME||'').trim()||'postgres',
        user: String(process.env.DB_USER||'').trim()||'postgres',
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
