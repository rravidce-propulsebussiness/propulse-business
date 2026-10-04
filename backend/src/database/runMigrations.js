const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('../config/database');

const migrationsDir = path.join(__dirname, 'migrations');
const baselineSchemaPath = path.join(__dirname, 'schema.sql');
const catalogSeedPath = path.join(__dirname, 'catalogSeed.sql');
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

function isNoTransactionMigration(sql) {
  return /^\s*--\s*propulse:no-transaction\b/im.test(String(sql || ''));
}

function splitTopLevelStatements(sql) {
  const surface = migrationControlSurface(sql);
  const statements = [];
  let start = 0;
  for (let i = 0; i < surface.length; i += 1) {
    if (surface[i] !== ';') continue;
    const statement = sql.slice(start, i + 1).trim();
    if (migrationControlSurface(statement).trim()) statements.push(statement);
    start = i + 1;
  }
  const tail = sql.slice(start).trim();
  if (migrationControlSurface(tail).trim()) statements.push(tail);
  return statements;
}

function getMigrationFiles() {
  const dated = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort()
        .map(f => path.join(migrationsDir, f))
    : [];
  const bootstrap = [baselineSchemaPath, catalogSeedPath].filter(filePath => fs.existsSync(filePath));
  return [...bootstrap, ...dated];
}

async function applyFile(client, filePath, appliedFilenames = null) {
  const filename = path.relative(__dirname, filePath).replace(/\\/g, '/');
  if (appliedFilenames?.has(filename)) return false;
  if (!appliedFilenames) {
    const existing = await client.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [filename]);
    if (existing.rowCount) return false;
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  if (isNoTransactionMigration(sql)) {
    for (const statement of splitTopLevelStatements(sql)) await client.query(statement);
    await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [filename]);
    appliedFilenames?.add(filename);
    return true;
  }

  if (hasTransactionControl(sql)) {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [filename]);
    appliedFilenames?.add(filename);
    return true;
  }

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(filename) VALUES($1)', [filename]);
    await client.query('COMMIT');
    appliedFilenames?.add(filename);
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

function migrationFilename(filePath) {
  return path.relative(__dirname, filePath).replace(/\\/g, '/');
}

function pendingMigrationFiles(files, appliedFilenames) {
  return files.filter(filePath => !appliedFilenames.has(migrationFilename(filePath)));
}

async function readAppliedFilenames(client) {
  const appliedRows = await client.query('SELECT filename FROM schema_migrations');
  return new Set(appliedRows.rows.map(row => String(row.filename)));
}

async function runMigrations() {
  const client = await pool.connect();
  let lockAcquired = false;
  try {
    await ensureLedger(client);
    const files = getMigrationFiles();

    // Most production restarts have no schema work to do. Avoid taking the
    // global migration advisory lock in that common case so overlapping
    // Hostinger restarts do not block readiness behind another no-op runner.
    let appliedFilenames = await readAppliedFilenames(client);
    let pendingFiles = pendingMigrationFiles(files, appliedFilenames);
    if (!pendingFiles.length) {
      console.log(`Database migrations completed (0 applied, ${files.length} checked; already current).`);
      return { applied: 0, checked: files.length };
    }

    await client.query('SELECT pg_advisory_lock(hashtext($1))', [MIGRATION_LOCK_KEY]);
    lockAcquired = true;

    // Another process may have completed the pending files while this process
    // waited for the lock. Re-read the ledger before applying anything.
    appliedFilenames = await readAppliedFilenames(client);
    pendingFiles = pendingMigrationFiles(files, appliedFilenames);

    let applied = 0;
    for (const file of pendingFiles) {
      try {
        if (await applyFile(client, file, appliedFilenames)) applied += 1;
      } catch (error) {
        const filename = migrationFilename(file);
        error.message = filename + ': ' + error.message;
        throw error;
      }
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

module.exports = { runMigrations, getMigrationFiles, migrationFilename, pendingMigrationFiles, hasTransactionControl, migrationControlSurface, isNoTransactionMigration, splitTopLevelStatements };
