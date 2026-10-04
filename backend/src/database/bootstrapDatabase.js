const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('../config/database');
const { spawnSync } = require('child_process');

const schemaPath = path.join(__dirname, 'schema.sql');
const catalogSeedPath = path.join(__dirname, 'catalogSeed.sql');

async function bootstrapDatabase() {
  const client = await pool.connect();
  try {
    const existingTables = await client.query(`
      SELECT tablename
        FROM pg_catalog.pg_tables
       WHERE schemaname='public'
       ORDER BY tablename
       LIMIT 5
    `);
    if (existingTables.rowCount) {
      const names = existingTables.rows.map(row => row.tablename).join(', ');
      throw Object.assign(
        new Error(`db:bootstrap requires an empty database. Found existing public tables: ${names}. Use npm run db:migrate for an existing installation.`),
        { code: 'DATABASE_NOT_EMPTY' }
      );
    }

    await client.query('BEGIN');
    await client.query(fs.readFileSync(schemaPath, 'utf8'));
    await client.query(fs.readFileSync(catalogSeedPath, 'utf8'));
    await client.query('COMMIT');
    console.log('Base database bootstrap completed successfully.');
  } catch (error) {
    if (error.code !== 'DATABASE_NOT_EMPTY') await client.query('ROLLBACK').catch(() => {});
    console.error(`Database bootstrap failed: ${error.message}`);
    process.exitCode = 1;
    return;
  } finally {
    client.release();
    await pool.end();
  }

  const migration = spawnSync(process.execPath, [path.join(__dirname, 'runMigrations.js')], {
    stdio: 'inherit',
    env: process.env
  });
  if (migration.error || migration.status !== 0) process.exitCode = migration.status || 1;
}

bootstrapDatabase();
