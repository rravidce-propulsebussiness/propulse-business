const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { getMembershipAccess } = require('./membershipAccessService');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be configured in production');
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'change-this-secret-in-development-only';

async function getMembershipSummary(userId, client = pool) {
  try {
    const access = await getMembershipAccess(userId, client);
    return {
      membership_type: access.isPro ? 'pro' : 'standard',
      is_pro_member: access.isPro,
      membership_expires_at: access.proExpiresAt,
      is_booster_active: access.isBoosterActive,
      booster_expires_at: access.boosterExpiresAt,
    };
  } catch {
    return {
      membership_type: 'standard',
      is_pro_member: false,
      membership_expires_at: null,
      is_booster_active: false,
      booster_expires_at: null,
    };
  }
}

async function publicUser(user, profile = null) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profile,
    ...(await getMembershipSummary(user.id)),
  };
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, EFFECTIVE_JWT_SECRET, { expiresIn: '7d' });
}

async function getBusinessProfile(userId, client = pool) {
  const profileResult = await client.query(
    `SELECT id, phone, business_name, business_details FROM business_profiles WHERE user_id = $1`,
    [userId]
  );
  const profile = profileResult.rows[0];
  if (!profile) return null;

  const [serviceResult, locationResult] = await Promise.all([
    client.query(
      `SELECT bps.id,bps.industry_id,i.name AS industry_name,bps.service_id,s.name AS service_name,
              bps.subservice_id,ss.name AS subservice_name
       FROM business_profile_services bps
       INNER JOIN industries i ON i.id = bps.industry_id
       INNER JOIN services s ON s.id = bps.service_id
       LEFT JOIN subservices ss ON ss.id = bps.subservice_id
       WHERE bps.business_profile_id = $1 AND bps.is_active = TRUE
       ORDER BY i.name ASC,s.name ASC,ss.name ASC`,
      [profile.id]
    ),
    client.query(
      `SELECT bpl.id,bpl.state_id,st.name AS state_name,bpl.city_id,c.name AS city_name
       FROM business_profile_locations bpl
       INNER JOIN states st ON st.id = bpl.state_id
       INNER JOIN cities c ON c.id = bpl.city_id
       WHERE bpl.business_profile_id = $1 AND bpl.is_active = TRUE
       ORDER BY st.name ASC,c.name ASC`,
      [profile.id]
    ),
  ]);

  return { ...profile, services: serviceResult.rows, locations: locationResult.rows };
}

async function validateBusinessSelections(client, services, locations) {
  if (!Array.isArray(services) || services.length === 0) {
    const error = new Error('At least one service selection is required');
    error.code = 'INVALID_BUSINESS_SELECTION';
    throw error;
  }
  if (!Array.isArray(locations) || locations.length === 0) {
    const error = new Error('At least one location selection is required');
    error.code = 'INVALID_BUSINESS_SELECTION';
    throw error;
  }

  const serviceKeys = new Set();
  for (const selection of services) {
    const { industryId, serviceId, subserviceId } = selection || {};
    const serviceResult = await client.query(`SELECT id FROM services WHERE id=$1 AND industry_id=$2 AND is_active=TRUE`,[serviceId,industryId]);
    if (!serviceResult.rows.length) {
      const error = new Error('Selected service does not belong to the selected industry');
      error.code = 'INVALID_BUSINESS_SELECTION';
      throw error;
    }
    if (subserviceId) {
      const subserviceResult = await client.query(`SELECT id FROM subservices WHERE id=$1 AND service_id=$2 AND is_active=TRUE`,[subserviceId,serviceId]);
      if (!subserviceResult.rows.length) {
        const error = new Error('Selected subservice does not belong to the selected service');
        error.code = 'INVALID_BUSINESS_SELECTION';
        throw error;
      }
    }
    const key = `${industryId}:${serviceId}:${subserviceId || ''}`;
    if (serviceKeys.has(key)) {
      const error = new Error('Duplicate service selections are not allowed');
      error.code = 'INVALID_BUSINESS_SELECTION';
      throw error;
    }
    serviceKeys.add(key);
  }

  const locationKeys = new Set();
  for (const selection of locations) {
    const { stateId, cityId } = selection || {};
    const locationResult = await client.query(
      `SELECT c.id FROM cities c INNER JOIN states st ON st.id=c.state_id
       WHERE c.id=$1 AND c.state_id=$2 AND c.is_active=TRUE AND st.is_active=TRUE`,
      [cityId,stateId]
    );
    if (!locationResult.rows.length) {
      const error = new Error('Selected city does not belong to the selected state');
      error.code = 'INVALID_BUSINESS_SELECTION';
      throw error;
    }
    const key = `${stateId}:${cityId}`;
    if (locationKeys.has(key)) {
      const error = new Error('Duplicate locations are not allowed');
      error.code = 'INVALID_BUSINESS_SELECTION';
      throw error;
    }
    locationKeys.add(key);
  }
}

async function signup({ name, email, password, phone, businessName, businessDetails, services, locations }) {
  const normalizedEmail = email.trim().toLowerCase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email)=$1',[normalizedEmail]);
    if (existing.rows.length) {
      const error = new Error('An account with this email already exists');
      error.code = 'EMAIL_EXISTS';
      throw error;
    }
    await validateBusinessSelections(client, services, locations);
    const passwordHash = await bcrypt.hash(password,12);
    const userResult = await client.query(
      `INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'business') RETURNING id,name,email,role`,
      [name.trim(),normalizedEmail,passwordHash]
    );
    const user=userResult.rows[0];
    const profileResult=await client.query(
      `INSERT INTO business_profiles (user_id,phone,business_name,business_details) VALUES ($1,$2,$3,$4) RETURNING id`,
      [user.id,phone.trim(),businessName.trim(),businessDetails.trim()]
    );
    const profileId=profileResult.rows[0].id;
    for(const selection of services) await client.query(
      `INSERT INTO business_profile_services (business_profile_id,industry_id,service_id,subservice_id) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [profileId,selection.industryId,selection.serviceId,selection.subserviceId||null]
    );
    for(const location of locations) await client.query(
      `INSERT INTO business_profile_locations (business_profile_id,state_id,city_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [profileId,location.stateId,location.cityId]
    );
    const profile=await getBusinessProfile(user.id,client);
    await client.query('COMMIT');
    return { user: await publicUser(user,profile), token: signToken(user) };
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function login({ email, password }) {
  const normalizedEmail=email.trim().toLowerCase();
  const result=await pool.query(`SELECT id,name,email,password_hash,role FROM users WHERE LOWER(email)=$1 AND is_active=TRUE`,[normalizedEmail]);
  const user=result.rows[0];
  if(!user||!(await bcrypt.compare(password,user.password_hash))){
    const error=new Error('Invalid email or password');
    error.code='INVALID_CREDENTIALS';
    throw error;
  }
  return { user: await publicUser(user,await getBusinessProfile(user.id)), token: signToken(user) };
}

function verifyToken(token){return jwt.verify(token,EFFECTIVE_JWT_SECRET);}

async function getUserById(id){
  const result=await pool.query(`SELECT id,name,email,role FROM users WHERE id=$1 AND is_active=TRUE`,[id]);
  if(!result.rows[0])return null;
  return await publicUser(result.rows[0],await getBusinessProfile(id));
}

module.exports={signup,login,verifyToken,getUserById};
