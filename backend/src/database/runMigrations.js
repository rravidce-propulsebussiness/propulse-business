const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('../config/database');

const migrationsDir = path.join(__dirname, 'migrations');
const MIGRATION_LOCK_KEY = 'propulse:schema-migrations';

async function ensureLedger(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
}

// BEGIN/COMMIT/ROLLBACK inside PL/pgSQL functions and DO blocks are not
// transaction-control statements for the migration runner. Strip comments,
// quoted strings, and dollar-quoted bodies before looking for top-level control.
function migrationControlSurface(sql) {
  let out = '';
  let i = 0;
  let mode = 'code';
  let dollarTag = '';
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (mode === 'lineComment') {
      out += ch === '\n' ? '\n' : ' ';
      if (ch === '\n') mode = 'code';
      i += 1;
      continue;
    }
    if (mode === 'blockComment') {
      if (ch === '*' && next === '/') { out += '  '; i += 2; mode = 'code'; continue; }
      out += ch === '\n' ? '\n' : ' ';
      i += 1;
      continue;
    }
    if (mode === 'singleQuote') {
      if (ch === "'" && next === "'") { out += '  '; i += 2; continue; }
      out += ch === '\n' ? '\n' : ' ';
      if (ch === "'") mode = 'code';
      i += 1;
      continue;
    }
    if (mode === 'doubleQuote') {
      if (ch === '"' && next === '"') { out += '  '; i += 2; continue; }
      out += ch === '\n' ? '\n' : ' ';
      if (ch === '"') mode = 'code';
      i += 1;
      continue;
    }
    if (mode === 'dollarQuote') {
      if (sql.startsWith(dollarTag, i)) {
        out += ' '.repeat(dollarTag.length);
        i += dollarTag.length;
        mode = 'code';
      } else {
        out += ch === '\n' ? '\n' : ' ';
        i += 1;
      }
      continue;
    }
    if (ch === '-' && next === '-') { out += '  '; i += 2; mode = 'lineComment'; continue; }
    if (ch === '/' && next === '*') { out += '  '; i += 2; mode = 'blockComment'; continue; }
    if (ch === "'") { out += ' '; i += 1; mode = 'singleQuote'; continue; }
    if (ch === '"') { out += ' '; i += 1; mode = 'doubleQuote'; continue; }
    if (ch === '$') {
      const match = sql.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (match) { dollarTag = match[0]; out += ' '.repeat(dollarTag.length); i += dollarTag.length; mode = 'dollarQuote'; continue; }
    }
    out += ch;
    i += 1;
  }
  return out;
}

function hasTransactionControl(sql) {
  const surface = migrationControlSurface(sql);
  return /(^|;)\s*(BEGIN|COMMIT|ROLLBACK)\s*;?/im.test(surface);
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
  let lockAcquired = false;
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [MIGRATION_LOCK_KEY]);
    lockAcquired = true;
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
    return { applied, checked: files.length };
  } finally {
    if (lockAcquired) await client.query('SELECT pg_advisory_unlock(hashtext($1))', [MIGRATION_LOCK_KEY]).catch(() => {});
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .catch(error => {
      console.error(`Database migrations failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { runMigrations, hasTransactionControl, migrationControlSurface };
