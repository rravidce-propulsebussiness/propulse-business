const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || 'Propulse Admin';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be configured before creating an admin.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && ADMIN_PASSWORD.length < 12) {
  console.error('ADMIN_PASSWORD must be at least 12 characters in production.');
  process.exit(1);
}

async function createOrResetAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const result = await pool.query(
    `INSERT INTO users (name,email,password_hash,role,is_active)
     VALUES ($1,LOWER($2),$3,'admin',TRUE)
     ON CONFLICT (email) DO UPDATE
     SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,role='admin',is_active=TRUE,updated_at=CURRENT_TIMESTAMP
     RETURNING id,name,email,role,is_active`,
    [ADMIN_NAME,ADMIN_EMAIL,passwordHash]
  );
  console.log(`Admin account is ready: ${result.rows[0].email}`);
}

createOrResetAdmin()
  .catch(error=>{console.error('Failed to create admin:',error.message);process.exitCode=1;})
  .finally(async()=>{await pool.end();});
