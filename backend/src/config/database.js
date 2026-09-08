const { Pool } = require('pg');
require('dotenv').config();

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
if (process.env.NODE_ENV === 'production') {
  const missing = required.filter(key => !String(process.env[key] || '').trim());
  if (missing.length) throw new Error(`Missing required database environment variables: ${missing.join(', ')}`);
}

const configuredPoolMax = Number(process.env.DB_POOL_MAX);
const poolMax = Number.isFinite(configuredPoolMax) && configuredPoolMax > 0
  ? Math.min(10, Math.max(2, configuredPoolMax))
  : 5;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: poolMax,
  idleTimeoutMillis: Math.max(1000, Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000),
  connectionTimeoutMillis: Math.max(1000, Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 10000),
  statement_timeout: Math.max(1000, Number(process.env.DB_STATEMENT_TIMEOUT_MS) || 30000),
  idle_in_transaction_session_timeout: Math.max(1000, Number(process.env.DB_IDLE_IN_TX_TIMEOUT_MS) || 60000),
  application_name: process.env.DB_APPLICATION_NAME || 'propulse-backend',
});

pool.on('error', error => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

module.exports = pool;
