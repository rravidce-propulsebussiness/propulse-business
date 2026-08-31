const pool = require('../config/database');

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

async function getBusinesses({ search = '', status = 'all', industryId = '', serviceId = '', stateId = '', cityId = '' } = {}) {
  const params = [];
  const conditions = [`u.role = 'business'`];

  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR bp.business_name ILIKE $${params.length} OR bp.phone ILIKE $${params.length})`);
  }
  if (status === 'active' || status === 'inactive') {
    params.push(status === 'active');
    conditions.push(`u.is_active = $${params.length}`);
  }
  if (industryId) { params.push(industryId); conditions.push(`EXISTS (SELECT 1 FROM business_profile_services x WHERE x.business_profile_id = bp.id AND x.industry_id = $${params.length} AND x.is_active = TRUE)`); }
  if (serviceId) { params.push(serviceId); conditions.push(`EXISTS (SELECT 1 FROM business_profile_services x WHERE x.business_profile_id = bp.id AND x.service_id = $${params.length} AND x.is_active = TRUE)`); }
  if (stateId) { params.push(stateId); conditions.push(`EXISTS (SELECT 1 FROM business_profile_locations x WHERE x.business_profile_id = bp.id AND x.state_id = $${params.length} AND x.is_active = TRUE)`); }
  if (cityId) { params.push(cityId); conditions.push(`EXISTS (SELECT 1 FROM business_profile_locations x WHERE x.business_profile_id = bp.id AND x.city_id = $${params.length} AND x.is_active = TRUE)`); }

  const result = await pool.query(`
    SELECT u.id AS user_id, u.name, u.email, u.role, u.is_active, u.created_at,
           bp.id AS business_profile_id, bp.phone, bp.business_name, bp.business_details,
           COALESCE((SELECT json_agg(json_build_object('industryId', x.industry_id, 'industryName', i.name, 'serviceId', x.service_id, 'serviceName', s.name, 'subserviceId', x.subservice_id, 'subserviceName', ss.name) ORDER BY i.name, s.name, ss.name)
             FROM business_profile_services x JOIN industries i ON i.id=x.industry_id JOIN services s ON s.id=x.service_id LEFT JOIN subservices ss ON ss.id=x.subservice_id
             WHERE x.business_profile_id=bp.id AND x.is_active=TRUE), '[]'::json) AS services,
           COALESCE((SELECT json_agg(json_build_object('stateId', x.state_id, 'stateName', st.name, 'cityId', x.city_id, 'cityName', c.name) ORDER BY st.name, c.name)
             FROM business_profile_locations x JOIN states st ON st.id=x.state_id JOIN cities c ON c.id=x.city_id
             WHERE x.business_profile_id=bp.id AND x.is_active=TRUE), '[]'::json) AS locations
    FROM users u
    LEFT JOIN business_profiles bp ON bp.user_id=u.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY u.created_at DESC
  `, params);
  return result.rows;
}

async function setBusinessStatus(userId, isActive) {
  const result = await pool.query(
    `UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND role = 'business' RETURNING id, name, email, is_active`,
    [isActive, userId]
  );
  return result.rows[0] || null;
}

module.exports = { getDashboardStats, getBusinesses, setBusinessStatus };
