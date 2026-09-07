const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { getMembershipAccess } = require('./membershipAccessService');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be configured in production');
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'change-this-secret-in-development-only';

async function getMembershipSummary(userId, client = pool) {
  try {
    const access = await getMembershipAccess(userId, client);
    return { membership_type: access.isPro ? 'pro' : 'standard', is_pro_member: access.isPro, membership_expires_at: access.proExpiresAt, is_booster_active: access.isBoosterActive, booster_expires_at: access.boosterExpiresAt };
  } catch {
    return { membership_type: 'standard', is_pro_member: false, membership_expires_at: null, is_booster_active: false, booster_expires_at: null };
  }
}

async function publicUser(user, profile = null) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, profile, ...(await getMembershipSummary(user.id)) };
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, EFFECTIVE_JWT_SECRET, { expiresIn: '7d' });
}

async function getBusinessProfile(userId, client = pool) {
  const profileResult = await client.query(`SELECT id, phone, business_name, business_details FROM business_profiles WHERE user_id = $1`, [userId]);
  const profile = profileResult.rows[0];
  if (!profile) return null;
  const [serviceResult, locationResult] = await Promise.all([
    client.query(`SELECT bps.id,bps.industry_id,i.name AS industry_name,bps.service_id,s.name AS service_name,bps.subservice_id,ss.name AS subservice_name FROM business_profile_services bps INNER JOIN industries i ON i.id=bps.industry_id INNER JOIN services s ON s.id=bps.service_id LEFT JOIN subservices ss ON ss.id=bps.subservice_id WHERE bps.business_profile_id=$1 AND bps.is_active=TRUE ORDER BY i.name,s.name,ss.name`, [profile.id]),
    client.query(`SELECT bpl.id,bpl.state_id,st.name AS state_name,bpl.city_id,c.name AS city_name FROM business_profile_locations bpl INNER JOIN states st ON st.id=bpl.state_id INNER JOIN cities c ON c.id=bpl.city_id WHERE bpl.business_profile_id=$1 AND bpl.is_active=TRUE ORDER BY st.name,c.name`, [profile.id]),
  ]);
  return { ...profile, services: serviceResult.rows, locations: locationResult.rows };
}

async function validateBusinessSelections(client, services, locations) {
  if (!Array.isArray(services) || services.length === 0) throw Object.assign(new Error('At least one service selection is required'), { code: 'INVALID_BUSINESS_SELECTION' });
  if (!Array.isArray(locations) || locations.length === 0) throw Object.assign(new Error('At least one location selection is required'), { code: 'INVALID_BUSINESS_SELECTION' });
  const serviceKeys = new Set();
  for (const selection of services) {
    const { industryId, serviceId, subserviceId } = selection || {};
    const serviceResult = await client.query(`SELECT id FROM services WHERE id=$1 AND industry_id=$2 AND is_active=TRUE`, [serviceId, industryId]);
    if (!serviceResult.rows.length) throw Object.assign(new Error('Selected service does not belong to the selected industry'), { code: 'INVALID_BUSINESS_SELECTION' });
    if (subserviceId) {
      const subserviceResult = await client.query(`SELECT id FROM subservices WHERE id=$1 AND service_id=$2 AND is_active=TRUE`, [subserviceId, serviceId]);
      if (!subserviceResult.rows.length) throw Object.assign(new Error('Selected subservice does not belong to the selected service'), { code: 'INVALID_BUSINESS_SELECTION' });
    }
    const key = `${industryId}:${serviceId}:${subserviceId || ''}`;
    if (serviceKeys.has(key)) throw Object.assign(new Error('Duplicate service selections are not allowed'), { code: 'INVALID_BUSINESS_SELECTION' });
    serviceKeys.add(key);
  }
  const locationKeys = new Set();
  for (const selection of locations) {
    const { stateId, cityId } = selection || {};
    const locationResult = await client.query(`SELECT c.id FROM cities c INNER JOIN states st ON st.id=c.state_id WHERE c.id=$1 AND c.state_id=$2 AND c.is_active=TRUE AND st.is_active=TRUE`, [cityId, stateId]);
    if (!locationResult.rows.length) throw Object.assign(new Error('Selected city does not belong to the selected state'), { code: 'INVALID_BUSINESS_SELECTION' });
    const key = `${stateId}:${cityId}`;
    if (locationKeys.has(key)) throw Object.assign(new Error('Duplicate locations are not allowed'), { code: 'INVALID_BUSINESS_SELECTION' });
    locationKeys.add(key);
  }
}

async function signup({ name, email, password, phone, businessName, businessDetails, services, locations }) {
  const normalizedEmail = email.trim().toLowerCase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email)=$1', [normalizedEmail]);
    if (existing.rows.length) throw Object.assign(new Error('An account with this email already exists'), { code: 'EMAIL_EXISTS' });
    await validateBusinessSelections(client, services, locations);
    const passwordHash = await bcrypt.hash(password, 12);
    const user = (await client.query(`INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'business') RETURNING id,name,email,role`, [name.trim(), normalizedEmail, passwordHash])).rows[0];
    const profileId = (await client.query(`INSERT INTO business_profiles (user_id,phone,business_name,business_details) VALUES ($1,$2,$3,$4) RETURNING id`, [user.id, phone.trim(), businessName.trim(), businessDetails.trim()])).rows[0].id;
    for (const selection of services) await client.query(`INSERT INTO business_profile_services (business_profile_id,industry_id,service_id,subservice_id) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [profileId, selection.industryId, selection.serviceId, selection.subserviceId || null]);
    for (const location of locations) await client.query(`INSERT INTO business_profile_locations (business_profile_id,state_id,city_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [profileId, location.stateId, location.cityId]);
    const profile = await getBusinessProfile(user.id, client);
    await client.query('COMMIT');
    return { user: await publicUser(user, profile), token: signToken(user) };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query(`SELECT id,name,email,password_hash,role FROM users WHERE LOWER(email)=$1 AND is_active=TRUE`, [normalizedEmail]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) throw Object.assign(new Error('Invalid email or password'), { code: 'INVALID_CREDENTIALS' });
  return { user: await publicUser(user, await getBusinessProfile(user.id)), token: signToken(user) };
}

async function verifyGoogleIdToken(idToken) {
  if (!process.env.GOOGLE_CLIENT_ID) throw Object.assign(new Error('Google sign-in is not configured'), { code: 'GOOGLE_NOT_CONFIGURED' });
  if (!idToken || typeof idToken !== 'string') throw Object.assign(new Error('Google credential is required'), { code: 'INVALID_GOOGLE_TOKEN' });

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.aud !== process.env.GOOGLE_CLIENT_ID || !['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss) || payload.email_verified !== 'true' || !payload.email || !payload.sub) {
    throw Object.assign(new Error('Invalid Google sign-in credential'), { code: 'INVALID_GOOGLE_TOKEN' });
  }
  return payload;
}

async function googleLogin({ idToken }) {
  const googleUser = await verifyGoogleIdToken(idToken);
  const normalizedEmail = googleUser.email.trim().toLowerCase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let user = (await client.query(`SELECT id,name,email,password_hash,role FROM users WHERE LOWER(email)=$1 AND is_active=TRUE FOR UPDATE`, [normalizedEmail])).rows[0];

    if (!user) {
      const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
      user = (await client.query(`INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'business') RETURNING id,name,email,password_hash,role`, [String(googleUser.name || normalizedEmail.split('@')[0]).trim().slice(0, 120), normalizedEmail, placeholderPassword])).rows[0];
      await client.query(`INSERT INTO business_profiles (user_id,phone,business_name,business_details) VALUES ($1,$2,$3,$4)`, [user.id, 'Not provided', String(googleUser.name || normalizedEmail.split('@')[0]).trim().slice(0, 160), 'Google account. Complete your business profile to receive better lead matches.']);
    }

    await client.query('COMMIT');
    return { user: await publicUser(user, await getBusinessProfile(user.id)), token: signToken(user) };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw Object.assign(new Error('An account with this email already exists. Sign in with your email and password.'), { code: 'EMAIL_EXISTS' });
    throw error;
  } finally { client.release(); }
}

async function createPasswordReset(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query(`SELECT id,name,email FROM users WHERE LOWER(email)=$1 AND is_active=TRUE`, [normalizedEmail]);
  const user = result.rows[0];
  if (!user) return null;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await pool.query(`DELETE FROM password_reset_tokens WHERE user_id=$1 OR expires_at < CURRENT_TIMESTAMP`, [user.id]);
  await pool.query(`INSERT INTO password_reset_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,CURRENT_TIMESTAMP + INTERVAL '30 minutes')`, [user.id, tokenHash]);
  return { user, token: rawToken };
}

async function resetPassword({ token, password }) {
  if (!token || typeof token !== 'string' || password.length < 8) throw Object.assign(new Error('A valid reset token and a password of at least 8 characters are required'), { code: 'INVALID_RESET_REQUEST' });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`SELECT pr.id,pr.user_id,u.id,u.name,u.email,u.role FROM password_reset_tokens pr INNER JOIN users u ON u.id=pr.user_id WHERE pr.token_hash=$1 AND pr.used_at IS NULL AND pr.expires_at > CURRENT_TIMESTAMP AND u.is_active=TRUE FOR UPDATE`, [tokenHash]);
    const row = result.rows[0];
    if (!row) throw Object.assign(new Error('This password reset link is invalid or has expired'), { code: 'INVALID_RESET_TOKEN' });
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query(`UPDATE users SET password_hash=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`, [passwordHash, row.user_id]);
    await client.query(`UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=$1`, [row.user_id]);
    await client.query('COMMIT');
    return { user: await publicUser({ id: row.user_id, name: row.name, email: row.email, role: row.role }, await getBusinessProfile(row.user_id)) };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

function verifyToken(token) { return jwt.verify(token, EFFECTIVE_JWT_SECRET); }

async function getAuthenticatedUser(id) {
  const result = await pool.query(`SELECT id,name,email,role FROM users WHERE id=$1 AND is_active=TRUE`, [id]);
  return result.rows[0] || null;
}

async function getUserById(id) {
  const user = await getAuthenticatedUser(id);
  if (!user) return null;
  return await publicUser(user, await getBusinessProfile(id));
}

module.exports = { signup, login, googleLogin, createPasswordReset, resetPassword, verifyToken, getUserById, getAuthenticatedUser };
