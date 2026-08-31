const pool = require('../config/database');

async function getProfile(userId, client = pool) {
  const profileResult = await client.query(
    `SELECT id, phone, business_name, business_details
     FROM business_profiles WHERE user_id = $1`,
    [userId]
  );
  const profile = profileResult.rows[0];
  if (!profile) return null;

  const [services, locations] = await Promise.all([
    client.query(
      `SELECT bps.id, bps.industry_id, i.name AS industry_name,
              bps.service_id, s.name AS service_name,
              bps.subservice_id, ss.name AS subservice_name
       FROM business_profile_services bps
       JOIN industries i ON i.id = bps.industry_id
       JOIN services s ON s.id = bps.service_id
       LEFT JOIN subservices ss ON ss.id = bps.subservice_id
       WHERE bps.business_profile_id = $1 AND bps.is_active = TRUE
       ORDER BY i.name, s.name, ss.name`, [profile.id]
    ),
    client.query(
      `SELECT bpl.id, bpl.state_id, st.name AS state_name,
              bpl.city_id, c.name AS city_name
       FROM business_profile_locations bpl
       JOIN states st ON st.id = bpl.state_id
       JOIN cities c ON c.id = bpl.city_id
       WHERE bpl.business_profile_id = $1 AND bpl.is_active = TRUE
       ORDER BY st.name, c.name`, [profile.id]
    ),
  ]);

  return { ...profile, services: services.rows, locations: locations.rows };
}

async function validateSelections(client, services, locations) {
  if (!Array.isArray(services) || !services.length) throw new Error('At least one service is required');
  if (!Array.isArray(locations) || !locations.length) throw new Error('At least one location is required');

  const serviceKeys = new Set();
  for (const item of services) {
    const { industryId, serviceId, subserviceId } = item || {};
    if (!industryId || !serviceId) throw new Error('Every service needs an industry and service');
    const service = await client.query(
      `SELECT id FROM services WHERE id = $1 AND industry_id = $2 AND is_active = TRUE`,
      [serviceId, industryId]
    );
    if (!service.rows.length) throw new Error('Invalid industry and service combination');
    if (subserviceId) {
      const subservice = await client.query(
        `SELECT id FROM subservices WHERE id = $1 AND service_id = $2 AND is_active = TRUE`,
        [subserviceId, serviceId]
      );
      if (!subservice.rows.length) throw new Error('Invalid subservice selection');
    }
    const key = `${industryId}:${serviceId}:${subserviceId || ''}`;
    if (serviceKeys.has(key)) throw new Error('Duplicate service selections are not allowed');
    serviceKeys.add(key);
  }

  const locationKeys = new Set();
  for (const item of locations) {
    const { stateId, cityId } = item || {};
    if (!stateId || !cityId) throw new Error('Every location needs a state and city');
    const city = await client.query(
      `SELECT c.id FROM cities c JOIN states st ON st.id = c.state_id
       WHERE c.id = $1 AND c.state_id = $2 AND c.is_active = TRUE AND st.is_active = TRUE`,
      [cityId, stateId]
    );
    if (!city.rows.length) throw new Error('Invalid state and city combination');
    const key = `${stateId}:${cityId}`;
    if (locationKeys.has(key)) throw new Error('Duplicate locations are not allowed');
    locationKeys.add(key);
  }
}

async function updateProfile(userId, { name, email, phone, businessName, businessDetails, services, locations }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query(
      `UPDATE users SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND is_active = TRUE RETURNING id, name, email, role`,
      [name.trim(), email.trim().toLowerCase(), userId]
    );
    if (!user.rows.length) throw new Error('Account not found');

    await validateSelections(client, services, locations);
    const profile = await client.query(
      `UPDATE business_profiles
       SET phone = $1, business_name = $2, business_details = $3, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $4 RETURNING id`,
      [phone.trim(), businessName.trim(), businessDetails.trim(), userId]
    );
    if (!profile.rows.length) throw new Error('Business profile not found');

    const profileId = profile.rows[0].id;
    await client.query('UPDATE business_profile_services SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE business_profile_id = $1', [profileId]);
    for (const item of services) {
      await client.query(
        `INSERT INTO business_profile_services
         (business_profile_id, industry_id, service_id, subservice_id, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (business_profile_id, industry_id, service_id, subservice_id)
         DO UPDATE SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP`,
        [profileId, item.industryId, item.serviceId, item.subserviceId || null]
      );
    }

    await client.query('UPDATE business_profile_locations SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE business_profile_id = $1', [profileId]);
    for (const item of locations) {
      await client.query(
        `INSERT INTO business_profile_locations
         (business_profile_id, state_id, city_id, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (business_profile_id, state_id, city_id)
         DO UPDATE SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP`,
        [profileId, item.stateId, item.cityId]
      );
    }

    const result = await getProfile(userId, client);
    await client.query('COMMIT');
    return { user: { ...user.rows[0], profile: result } };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { getProfile, updateProfile };
