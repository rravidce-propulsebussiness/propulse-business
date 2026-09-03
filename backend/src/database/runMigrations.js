const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('../config/database');

const migrationsDir = path.join(__dirname, 'migrations');
const legacyMigrations = [
  path.join(__dirname, 'leadPurchasesMigration.sql'),
  path.join(__dirname, 'leadEntitlementsMigration.sql')
];

async function ensureLedger(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
}

async function applyFile(client, filePath) {
  const filename = path.relative(__dirname, filePath).replace(/\\/g, '/');
  const existing = await client.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [filename]);
  if (existing.rowCount) return false;
  await client.query(fs.readFileSync(filePath, 'utf8'));
  await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [filename]);
  return true;
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureLedger(client);
    const files = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort().map(f => path.join(migrationsDir, f))
      : [];
    const all = [...legacyMigrations, ...files];
    for (const file of all) await applyFile(client, file);
    await client.query('COMMIT');
    console.log(`Database migrations completed (${all.length} migration files checked).`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Database migrations failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
