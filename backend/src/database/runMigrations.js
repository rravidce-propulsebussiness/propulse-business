const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('../config/database');

const migrationsDir = path.join(__dirname, 'migrations');

async function ensureLedger(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
}

function hasTransactionControl(sql) {
  return /(^|;)\s*(BEGIN|COMMIT|ROLLBACK)\s*;?/im.test(sql);
}

async function applyFile(client, filePath) {
  const filename = path.relative(__dirname, filePath).replace(/\\/g, '/');
  const existing = await client.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [filename]);
  if (existing.rowCount) return false;

  const sql = fs.readFileSync(filePath, 'utf8');
  if (hasTransactionControl(sql)) {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [filename]);
    return true;
  }

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [filename]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await ensureLedger(client);
    const files = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir)
          .filter(f => f.endsWith('.sql'))
          .sort()
          .map(f => path.join(migrationsDir, f))
      : [];
    let applied = 0;
    for (const file of files) {
      if (await applyFile(client, file)) applied += 1;
    }
    console.log(`Database migrations completed (${applied} applied, ${files.length} checked).`);
  } catch (error) {
    console.error(`Database migrations failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
