const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@propulsebusiness.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Propulse Admin';

async function createOrResetAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ($1, LOWER($2), $3, 'admin', TRUE)
     ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         role = 'admin',
         is_active = TRUE,
         updated_at = CURRENT_TIMESTAMP
     RETURNING id, name, email, role, is_active`,
    [ADMIN_NAME, ADMIN_EMAIL, passwordHash]
  );

  console.log('\nAdmin account is ready.');
  console.log(`Email: ${result.rows[0].email}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log(`Role: ${result.rows[0].role}`);
  console.log('Use these credentials at /login.\n');
}

createOrResetAdmin()
  .catch((error) => {
    console.error('Failed to create admin:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
