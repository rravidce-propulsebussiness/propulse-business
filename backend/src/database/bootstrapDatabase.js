const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('../config/database');

const schemaPath = path.join(__dirname, 'schema.sql');
const catalogSeedPath = path.join(__dirname, 'catalogSeed.sql');

async function bootstrapDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(fs.readFileSync(schemaPath, 'utf8'));
    await client.query(fs.readFileSync(catalogSeedPath, 'utf8'));
    await client.query('COMMIT');
    console.log('Database bootstrap completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Database bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

bootstrapDatabase();
