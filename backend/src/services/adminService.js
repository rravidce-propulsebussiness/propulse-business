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
             WHERE x.business_profile_id=bp.id AND x.is_active=TRUE), '[]'::json) AS locations,
           m.id AS membership_id, m.status AS membership_status, m.starts_at AS membership_started_at,
           m.expires_at AS membership_expires_at, mp.id AS membership_plan_id, mp.name AS membership_plan_name,
           mp.plan_group AS membership_plan_group, mp.plan_type AS membership_plan_type,
           mp.billing_period AS membership_billing_period, mp.billing_months AS membership_billing_months,
           bm.id AS booster_membership_id, bm.expires_at AS booster_expires_at,
           CASE WHEN m.id IS NOT NULL AND m.status='active' AND m.expires_at>CURRENT_TIMESTAMP THEN TRUE ELSE FALSE END AS pro_active
    FROM users u
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT m.* FROM memberships m
      JOIN membership_plans mp0 ON mp0.id=m.membership_plan_id
      WHERE m.user_id=u.id AND LOWER(COALESCE(mp0.plan_type,''))='pro'
      ORDER BY CASE WHEN m.status='active' AND m.expires_at>CURRENT_TIMESTAMP THEN 0 ELSE 1 END, m.created_at DESC
      LIMIT 1
    ) m ON TRUE
    LEFT JOIN membership_plans mp ON mp.id=m.membership_plan_id
    LEFT JOIN LATERAL (
      SELECT mb.id,mb.expires_at FROM memberships mb
      JOIN membership_plans mpb ON mpb.id=mb.membership_plan_id
      WHERE mb.user_id=u.id AND LOWER(COALESCE(mpb.plan_type,''))='booster'
      ORDER BY CASE WHEN mb.status='active' AND mb.expires_at>CURRENT_TIMESTAMP THEN 0 ELSE 1 END, mb.created_at DESC
      LIMIT 1
    ) bm ON TRUE
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

async function updateMembership(userId, { action, planId, startsAt, expiresAt, days }) {
  const validActions = new Set(['activate','extend','reduce','terminate']);
  if (!validActions.has(action)) { const e=new Error('Invalid membership action'); e.code='INVALID_MEMBERSHIP_ACTION'; throw e; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = (await client.query('SELECT id,role FROM users WHERE id=$1 FOR UPDATE',[userId])).rows[0];
    if (!user) { const e=new Error('User not found'); e.code='NOT_FOUND'; throw e; }
    const current = (await client.query(`SELECT m.*,mp.name AS plan_name FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id WHERE m.user_id=$1 AND LOWER(COALESCE(mp.plan_type,''))='pro' ORDER BY CASE WHEN m.status='active' AND m.expires_at>CURRENT_TIMESTAMP THEN 0 ELSE 1 END,m.created_at DESC LIMIT 1 FOR UPDATE`,[userId])).rows[0];
    if (action === 'terminate') {
      if (!current || current.status !== 'active') { const e=new Error('No active Pro membership found'); e.code='NO_MEMBERSHIP'; throw e; }
      const result=(await client.query(`UPDATE memberships SET status='cancelled',expires_at=LEAST(expires_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,[current.id])).rows[0];
      await client.query('COMMIT'); return result;
    }
    const cleanDays = Number(days);
    if (action === 'extend' || action === 'reduce') {
      if (!current || current.status !== 'active') { const e=new Error('No active Pro membership found'); e.code='NO_MEMBERSHIP'; throw e; }
      if (!Number.isInteger(cleanDays) || cleanDays <= 0 || cleanDays > 3650) { const e=new Error('Days must be a whole number between 1 and 3650'); e.code='INVALID_DAYS'; throw e; }
      const modifier = action === 'extend' ? `+ INTERVAL '${cleanDays} days'` : `- INTERVAL '${cleanDays} days'`;
      const result=(await client.query(`UPDATE memberships SET expires_at=GREATEST(starts_at,expires_at ${modifier}),status=CASE WHEN expires_at ${modifier} > CURRENT_TIMESTAMP THEN 'active' ELSE 'expired' END,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,[current.id])).rows[0];
      await client.query('COMMIT'); return result;
    }
    const selectedPlanId = Number(planId);
    if (!Number.isInteger(selectedPlanId)) { const e=new Error('A Pro membership plan is required'); e.code='INVALID_PLAN'; throw e; }
    const plan=(await client.query(`SELECT id,name,plan_type,duration_days,is_active FROM membership_plans WHERE id=$1`,[selectedPlanId])).rows[0];
    if (!plan || !plan.is_active || String(plan.plan_type).toLowerCase() !== 'pro') { const e=new Error('Select an active Pro membership plan'); e.code='INVALID_PLAN'; throw e; }
    const start = startsAt ? new Date(startsAt) : new Date();
    const end = expiresAt ? new Date(expiresAt) : new Date(start.getTime()+Number(plan.duration_days)*86400000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) { const e=new Error('Membership start and expiry dates are invalid'); e.code='INVALID_DATES'; throw e; }
    let result;
    if (current) result=(await client.query(`UPDATE memberships SET membership_plan_id=$1,starts_at=$2,expires_at=$3,status='active',updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *`,[selectedPlanId,start,end,current.id])).rows[0];
    else result=(await client.query(`INSERT INTO memberships(user_id,membership_plan_id,starts_at,expires_at,status) VALUES($1,$2,$3,$4,'active') RETURNING *`,[userId,selectedPlanId,start,end])).rows[0];
    await client.query('COMMIT'); return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

async function removeMembership(userId) { return updateMembership(userId,{action:'terminate'}); }

module.exports={getDashboardStats,getUsers,createAdmin,setUserStatus,updateUserProfile,updateMembership,removeMembership};
