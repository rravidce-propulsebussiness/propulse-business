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

  return {
    totalUsers: row.total_users,
    activeUsers: row.active_users,
    businesses: row.businesses,
    activeBusinesses: row.active_businesses,
    industries: row.industries,
    services: row.services,
    subservices: row.subservices,
    states: row.states,
    cities: row.cities,
  };
}

module.exports = { getDashboardStats };
