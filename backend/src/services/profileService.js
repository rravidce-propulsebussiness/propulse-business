const pool = require('../config/database');

async function getProfile(userId, client = pool) {
  const profileResult = await client.query(
    `SELECT id, phone, business_name, business_details
     FROM business_profiles WHERE user_id = $1`,
    [userId]
  );
  const profile = profileResult.rows[0];
  if (!profile) return null;

  const [services, locations, companyProofs] = await Promise.all([
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
              bpl.city_id, c.name AS city_name, bpl.subcity_id, sc.name AS subcity_name, bpl.pincode
       FROM business_profile_locations bpl
       JOIN states st ON st.id = bpl.state_id
       JOIN cities c ON c.id = bpl.city_id
       LEFT JOIN subcities sc ON sc.id = bpl.subcity_id
       WHERE bpl.business_profile_id = $1 AND bpl.is_active = TRUE
       ORDER BY st.name, c.name`, [profile.id]
    ),
    client.query(
      `SELECT id, original_name, mime_type, file_size, file_url, status, created_at
       FROM company_proof_documents
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC`, [userId]
    ),
  ]);

  return { ...profile, services: services.rows, locations: locations.rows, company_proofs: companyProofs.rows };
}

function profileError(message,code='INVALID_PROFILE_SELECTION'){
  return Object.assign(new Error(message),{code});
}

async function validateSelections(client, services, locations) {
  if (!Array.isArray(services) || !services.length) throw profileError('At least one service is required');
  if (!Array.isArray(locations) || !locations.length) throw profileError('At least one location is required');

  const normalizedServices=services.map(item=>{
    const industryId=Number(item?.industryId);
    const serviceId=Number(item?.serviceId);
    const subserviceId=item?.subserviceId==null||item.subserviceId===''?null:Number(item.subserviceId);
    if(!Number.isInteger(industryId)||industryId<=0||!Number.isInteger(serviceId)||serviceId<=0||(subserviceId!==null&&(!Number.isInteger(subserviceId)||subserviceId<=0))){
      throw profileError('Every service needs a valid industry and service');
    }
    return{industryId,serviceId,subserviceId};
  });
  const serviceKeys=new Set(normalizedServices.map(x=>`${x.industryId}:${x.serviceId}:${x.subserviceId||''}`));
  if(serviceKeys.size!==normalizedServices.length)throw profileError('Duplicate service selections are not allowed');

  const normalizedLocations=locations.map(item=>{
    const stateId=Number(item?.stateId);
    const cityId=Number(item?.cityId);
    const subcityId=item?.subcityId==null||item.subcityId===''?null:Number(item.subcityId);
    const pincode=item?.pincode==null||item.pincode===''?null:String(item.pincode).trim();
    if(!Number.isInteger(stateId)||stateId<=0||!Number.isInteger(cityId)||cityId<=0||(subcityId!==null&&(!Number.isInteger(subcityId)||subcityId<=0))){
      throw profileError('Every location needs a valid state and city');
    }
    if(pincode&&!/^\d{6}$/.test(pincode))throw profileError('Pincode must be a valid 6-digit code');
    return{stateId,cityId,subcityId,pincode};
  });
  const locationKeys=new Set(normalizedLocations.map(x=>`${x.stateId}:${x.cityId}:${x.subcityId||''}:${x.pincode||''}`));
  if(locationKeys.size!==normalizedLocations.length)throw profileError('Duplicate locations are not allowed');

  const [serviceResult,locationResult]=await Promise.all([
    client.query(`
      WITH requested AS (
        SELECT * FROM UNNEST($1::int[],$2::int[],$3::int[]) AS x(industry_id,service_id,subservice_id)
      )
      SELECT COUNT(*)::int valid_count
      FROM requested r
      JOIN services s ON s.id=r.service_id AND s.industry_id=r.industry_id AND s.is_active=TRUE
      LEFT JOIN subservices ss ON ss.id=r.subservice_id AND ss.service_id=r.service_id AND ss.is_active=TRUE
      WHERE r.subservice_id IS NULL OR ss.id IS NOT NULL
    `,[
      normalizedServices.map(x=>x.industryId),
      normalizedServices.map(x=>x.serviceId),
      normalizedServices.map(x=>x.subserviceId)
    ]),
    client.query(`
      WITH requested AS (
        SELECT * FROM UNNEST($1::int[],$2::int[],$3::int[]) AS x(state_id,city_id,subcity_id)
      )
      SELECT COUNT(*)::int valid_count
      FROM requested r
      JOIN states st ON st.id=r.state_id AND st.is_active=TRUE
      JOIN cities c ON c.id=r.city_id AND c.state_id=r.state_id AND c.is_active=TRUE
      LEFT JOIN subcities sc ON sc.id=r.subcity_id AND sc.city_id=r.city_id AND sc.is_active=TRUE
      WHERE r.subcity_id IS NULL OR sc.id IS NOT NULL
    `,[
      normalizedLocations.map(x=>x.stateId),
      normalizedLocations.map(x=>x.cityId),
      normalizedLocations.map(x=>x.subcityId)
    ])
  ]);

  if(Number(serviceResult.rows[0]?.valid_count||0)!==normalizedServices.length)throw profileError('Invalid industry, service or subservice selection');
  if(Number(locationResult.rows[0]?.valid_count||0)!==normalizedLocations.length)throw profileError('Invalid state, city or subcity selection');

  const byCity=new Map();
  for(const location of normalizedLocations)byCity.set(`${location.stateId}:${location.cityId}`,location);
  return{services:normalizedServices,locations:[...byCity.values()]};
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
    if (!user.rows.length) throw profileError('Account not found','PROFILE_ACCOUNT_NOT_FOUND');

    const validatedSelections=await validateSelections(client, services, locations);
    const profile = await client.query(
      `UPDATE business_profiles
       SET phone = $1, business_name = $2, business_details = $3, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $4 RETURNING id`,
      [phone.trim(), businessName.trim(), businessDetails.trim(), userId]
    );
    if (!profile.rows.length) throw profileError('Business profile not found','PROFILE_NOT_FOUND');

    const profileId = profile.rows[0].id;
    await client.query('UPDATE business_profile_services SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE business_profile_id = $1', [profileId]);
    await client.query(`
      INSERT INTO business_profile_services
        (business_profile_id,industry_id,service_id,subservice_id,is_active)
      SELECT $1,x.industry_id,x.service_id,x.subservice_id,TRUE
      FROM UNNEST($2::int[],$3::int[],$4::int[]) AS x(industry_id,service_id,subservice_id)
      ON CONFLICT (business_profile_id,industry_id,service_id,subservice_id)
      DO UPDATE SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP
    `,[
      profileId,
      validatedSelections.services.map(x=>x.industryId),
      validatedSelections.services.map(x=>x.serviceId),
      validatedSelections.services.map(x=>x.subserviceId)
    ]);

    await client.query('UPDATE business_profile_locations SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE business_profile_id = $1', [profileId]);
    await client.query(`
      INSERT INTO business_profile_locations
        (business_profile_id,state_id,city_id,subcity_id,pincode,is_active)
      SELECT $1,x.state_id,x.city_id,x.subcity_id,x.pincode,TRUE
      FROM UNNEST($2::int[],$3::int[],$4::int[],$5::text[]) AS x(state_id,city_id,subcity_id,pincode)
      ON CONFLICT (business_profile_id,state_id,city_id)
      DO UPDATE SET subcity_id=EXCLUDED.subcity_id,pincode=EXCLUDED.pincode,is_active=TRUE,updated_at=CURRENT_TIMESTAMP
    `,[
      profileId,
      validatedSelections.locations.map(x=>x.stateId),
      validatedSelections.locations.map(x=>x.cityId),
      validatedSelections.locations.map(x=>x.subcityId),
      validatedSelections.locations.map(x=>x.pincode)
    ]);

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

module.exports = { getProfile, updateProfile, validateSelections };
