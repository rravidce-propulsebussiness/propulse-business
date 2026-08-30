const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

function publicUser(user, profile = null) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, profile };
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

async function getBusinessProfile(userId, client = pool) {
  const result = await client.query(
    `SELECT bp.id, bp.phone, bp.business_name, bp.business_details,
            bp.industry_id, i.name AS industry_name,
            bp.service_id, s.name AS service_name,
            bp.subservice_id, ss.name AS subservice_name,
            bp.state_id, st.name AS state_name,
            bp.city_id, c.name AS city_name
     FROM business_profiles bp
     INNER JOIN industries i ON i.id = bp.industry_id
     INNER JOIN services s ON s.id = bp.service_id
     LEFT JOIN subservices ss ON ss.id = bp.subservice_id
     INNER JOIN states st ON st.id = bp.state_id
     INNER JOIN cities c ON c.id = bp.city_id
     WHERE bp.user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function validateBusinessProfile(client, { industryId, serviceId, subserviceId, stateId, cityId }) {
  const serviceResult = await client.query(
    `SELECT id FROM services WHERE id = $1 AND industry_id = $2 AND is_active = TRUE`,
    [serviceId, industryId]
  );
  if (!serviceResult.rows.length) {
    const error = new Error('Selected service does not belong to the selected industry');
    error.code = 'INVALID_BUSINESS_SELECTION';
    throw error;
  }

  if (subserviceId) {
    const subserviceResult = await client.query(
      `SELECT id FROM subservices WHERE id = $1 AND service_id = $2 AND is_active = TRUE`,
      [subserviceId, serviceId]
    );
    if (!subserviceResult.rows.length) {
      const error = new Error('Selected subservice does not belong to the selected service');
      error.code = 'INVALID_BUSINESS_SELECTION';
      throw error;
    }
  }

  const locationResult = await client.query(
    `SELECT c.id FROM cities c
     INNER JOIN states st ON st.id = c.state_id
     WHERE c.id = $1 AND c.state_id = $2 AND c.is_active = TRUE AND st.is_active = TRUE`,
    [cityId, stateId]
  );
  if (!locationResult.rows.length) {
    const error = new Error('Selected city does not belong to the selected state');
    error.code = 'INVALID_BUSINESS_SELECTION';
    throw error;
  }
}

async function signup({ name, email, password, phone, businessName, businessDetails, industryId, serviceId, subserviceId, stateId, cityId }) {
  const normalizedEmail = email.trim().toLowerCase();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existing.rows.length) {
      const error = new Error('An account with this email already exists');
      error.code = 'EMAIL_EXISTS';
      throw error;
    }

    await validateBusinessProfile(client, { industryId, serviceId, subserviceId, stateId, cityId });

    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin') RETURNING id, name, email, role`,
      [name.trim(), normalizedEmail, passwordHash]
    );
    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO business_profiles
       (user_id, phone, business_name, business_details, industry_id, service_id, subservice_id, state_id, city_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [user.id, phone.trim(), businessName.trim(), businessDetails.trim(), industryId, serviceId, subserviceId || null, stateId, cityId]
    );

    const profile = await getBusinessProfile(user.id, client);
    await client.query('COMMIT');
    return { user: publicUser(user, profile), token: signToken(user) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query(
    `SELECT id, name, email, password_hash, role FROM users
     WHERE LOWER(email) = $1 AND is_active = TRUE`,
    [normalizedEmail]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const error = new Error('Invalid email or password');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }
  const profile = await getBusinessProfile(user.id);
  return { user: publicUser(user, profile), token: signToken(user) };
}

function verifyToken(token) { return jwt.verify(token, JWT_SECRET); }

async function getUserById(id) {
  const result = await pool.query(
    `SELECT id, name, email, role FROM users WHERE id = $1 AND is_active = TRUE`,
    [id]
  );
  if (!result.rows[0]) return null;
  return publicUser(result.rows[0], await getBusinessProfile(id));
}

module.exports = { signup, login, verifyToken, getUserById };
