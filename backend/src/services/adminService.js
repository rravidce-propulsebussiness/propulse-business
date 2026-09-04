const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { validateSelections } = require('./profileService');

async function getDashboardStats() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM users WHERE is_active = TRUE) AS active_users,
      (SELECT COUNT(*)::int FROM users WHERE role = 'business') AS businesses,
      (SELECT COUNT(*)::int FROM users WHERE role = 'business' AND is_active = TRUE) AS active_businesses,
      (SELECT COUNT(*)::int FROM industries WHERE is_active = TRUE) AS industries,
      (SELECT COUNT(*)::int FROM services WHERE is_active = TRUE) AS services,
      (SELECT COUNT(*)::int FROM subservices WHERE is_active = TRUE) AS subservices,
      (SELECT COUNT(*)::int FROM states WHERE is_active = TRUE) AS states,
      (SELECT COUNT(*)::int FROM cities WHERE is_active = TRUE) AS cities
  `);
  const row = result.rows[0];
  return { totalUsers: row.total_users, activeUsers: row.active_users, businesses: row.businesses, activeBusinesses: row.active_businesses, industries: row.industries, services: row.services, subservices: row.subservices, states: row.states, cities: row.cities };
}

async function getUsers({ search = '', role = 'all', status = 'all', industryId = '', serviceId = '', stateId = '', cityId = '' } = {}) {
  const params = [];
  const conditions = [];
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR bp.business_name ILIKE $${params.length} OR bp.phone ILIKE $${params.length})`);
  }
  if (role === 'admin' || role === 'business') { params.push(role); conditions.push(`u.role = $${params.length}`); }
  if (status === 'active' || status === 'inactive') { params.push(status === 'active'); conditions.push(`u.is_active = $${params.length}`); }
  if (industryId) { params.push(industryId); conditions.push(`EXISTS (SELECT 1 FROM business_profile_services x WHERE x.business_profile_id=bp.id AND x.industry_id=$${params.length} AND x.is_active=TRUE)`); }
  if (serviceId) { params.push(serviceId); conditions.push(`EXISTS (SELECT 1 FROM business_profile_services x WHERE x.business_profile_id=bp.id AND x.service_id=$${params.length} AND x.is_active=TRUE)`); }
  if (stateId) { params.push(stateId); conditions.push(`EXISTS (SELECT 1 FROM business_profile_locations x WHERE x.business_profile_id=bp.id AND x.state_id=$${params.length} AND x.is_active=TRUE)`); }
  if (cityId) { params.push(cityId); conditions.push(`EXISTS (SELECT 1 FROM business_profile_locations x WHERE x.business_profile_id=bp.id AND x.city_id=$${params.length} AND x.is_active=TRUE)`); }

  const result = await pool.query(`
    SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
           bp.id AS business_profile_id, bp.business_name, bp.phone, bp.business_details,
           COALESCE((SELECT COUNT(*)::int FROM business_profile_services x WHERE x.business_profile_id = bp.id AND x.is_active = TRUE), 0) AS service_count,
           COALESCE((SELECT COUNT(*)::int FROM business_profile_locations x WHERE x.business_profile_id = bp.id AND x.is_active = TRUE), 0) AS location_count,
           COALESCE((SELECT json_agg(json_build_object('industryId',x.industry_id,'industryName',i.name,'serviceId',x.service_id,'serviceName',s.name,'subserviceId',x.subservice_id,'subserviceName',ss.name) ORDER BY i.name,s.name,ss.name)
             FROM business_profile_services x
             JOIN industries i ON i.id=x.industry_id
             JOIN services s ON s.id=x.service_id
             LEFT JOIN subservices ss ON ss.id=x.subservice_id
             WHERE x.business_profile_id=bp.id AND x.is_active=TRUE), '[]'::json) AS services,
           COALESCE((SELECT json_agg(json_build_object('stateId',x.state_id,'stateName',st.name,'cityId',x.city_id,'cityName',c.name,'subcityId',x.subcity_id,'subcityName',sc.name,'pincode',x.pincode) ORDER BY st.name,c.name)
             FROM business_profile_locations x
             JOIN states st ON st.id=x.state_id
             JOIN cities c ON c.id=x.city_id
             LEFT JOIN subcities sc ON sc.id=x.subcity_id
             WHERE x.business_profile_id=bp.id AND x.is_active=TRUE), '[]'::json) AS locations
    FROM users u
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY u.created_at DESC
  `, params);
  return result.rows;
}

async function createAdmin({ name, email, password }) {
  const cleanName = String(name || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!cleanName || !normalizedEmail || String(password || '').length < 8) {
    const error = new Error('Name, valid email and password of at least 8 characters are required');
    error.code = 'INVALID_ADMIN';
    throw error;
  }
  const existing = await pool.query('SELECT id FROM users WHERE LOWER(email)=$1', [normalizedEmail]);
  if (existing.rowCount) {
    const error = new Error('An account with this email already exists');
    error.code = 'EMAIL_EXISTS';
    throw error;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'admin') RETURNING id,name,email,role,is_active,created_at`,
    [cleanName, normalizedEmail, passwordHash]
  );
  return result.rows[0];
}

async function setUserStatus(userId,isActive) {
  const result=await pool.query(`UPDATE users SET is_active=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id,name,email,role,is_active`,[isActive,userId]);
  return result.rows[0]||null;
}

async function updateUserProfile(userId, { name, email, phone, businessName, businessDetails, services, locations }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = (await client.query('SELECT id,name,email,role FROM users WHERE id=$1 FOR UPDATE', [userId])).rows[0];
    if (!user) { const e = new Error('User not found'); e.code='NOT_FOUND'; throw e; }
    const cleanName = String(name ?? user.name).trim();
    const normalizedEmail = String(email ?? user.email).trim().toLowerCase();
    if (!cleanName || !normalizedEmail) { const e=new Error('Name and email are required'); e.code='INVALID_USER'; throw e; }
    const duplicate = await client.query('SELECT id FROM users WHERE LOWER(email)=$1 AND id<>$2', [normalizedEmail,userId]);
    if (duplicate.rowCount) { const e=new Error('An account with this email already exists'); e.code='EMAIL_EXISTS'; throw e; }
    const updatedUser = (await client.query('UPDATE users SET name=$1,email=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING id,name,email,role,is_active,created_at', [cleanName,normalizedEmail,userId])).rows[0];
    if (user.role === 'business') {
      const hasConfiguration = Array.isArray(services) || Array.isArray(locations);
      if (hasConfiguration) await validateSelections(client, services, locations);
      const profile = (await client.query('SELECT id FROM business_profiles WHERE user_id=$1 FOR UPDATE',[userId])).rows[0];
      if (!profile) {
        if (String(phone??'').trim() || String(businessName??'').trim() || String(businessDetails??'').trim() || hasConfiguration) {
          const created = (await client.query('INSERT INTO business_profiles(user_id,phone,business_name,business_details) VALUES($1,$2,$3,$4) RETURNING id',[userId,String(phone??'').trim(),String(businessName??'').trim(),String(businessDetails??'').trim()])).rows[0];
          if (hasConfiguration) {
            for (const item of services) await client.query(`INSERT INTO business_profile_services (business_profile_id,industry_id,service_id,subservice_id,is_active) VALUES($1,$2,$3,$4,TRUE) ON CONFLICT (business_profile_id,industry_id,service_id,subservice_id) DO UPDATE SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,[created.id,item.industryId,item.serviceId,item.subserviceId||null]);
            for (const item of locations) await client.query(`INSERT INTO business_profile_locations (business_profile_id,state_id,city_id,subcity_id,pincode,is_active) VALUES($1,$2,$3,$4,$5,TRUE) ON CONFLICT (business_profile_id,state_id,city_id) DO UPDATE SET subcity_id=EXCLUDED.subcity_id,pincode=EXCLUDED.pincode,is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,[created.id,item.stateId,item.cityId,item.subcityId||null,item.pincode||null]);
          }
        }
      } else {
        await client.query('UPDATE business_profiles SET phone=$1,business_name=$2,business_details=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$4', [String(phone??'').trim(),String(businessName??'').trim(),String(businessDetails??'').trim(),profile.id]);
        if (hasConfiguration) {
          await client.query('UPDATE business_profile_services SET is_active=FALSE,updated_at=CURRENT_TIMESTAMP WHERE business_profile_id=$1',[profile.id]);
          for (const item of services) await client.query(`INSERT INTO business_profile_services (business_profile_id,industry_id,service_id,subservice_id,is_active) VALUES($1,$2,$3,$4,TRUE) ON CONFLICT (business_profile_id,industry_id,service_id,subservice_id) DO UPDATE SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,[profile.id,item.industryId,item.serviceId,item.subserviceId||null]);
          await client.query('UPDATE business_profile_locations SET is_active=FALSE,updated_at=CURRENT_TIMESTAMP WHERE business_profile_id=$1',[profile.id]);
          for (const item of locations) await client.query(`INSERT INTO business_profile_locations (business_profile_id,state_id,city_id,subcity_id,pincode,is_active) VALUES($1,$2,$3,$4,$5,TRUE) ON CONFLICT (business_profile_id,state_id,city_id) DO UPDATE SET subcity_id=EXCLUDED.subcity_id,pincode=EXCLUDED.pincode,is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,[profile.id,item.stateId,item.cityId,item.subcityId||null,item.pincode||null]);
        }
      }
    }
    await client.query('COMMIT');
    return updatedUser;
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

module.exports={getDashboardStats,getUsers,createAdmin,setUserStatus,updateUserProfile};
