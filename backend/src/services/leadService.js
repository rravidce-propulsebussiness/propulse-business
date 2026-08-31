const pool = require('../config/database');

const DEFAULT_PRICING = {
  normal: { oneShare: 0, threeShares: 0, fiveShares: 0 },
  pro: { oneShare: 0, threeShares: 0, fiveShares: 0 },
};

function cleanJson(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

async function createLead({
  industryId, serviceId, subserviceId, stateId, cityId,
  customerName, customerPhone, customerEmail, requirement,
  propertyType, budget, source, notes, customFields, pricing, createdBy,
}) {
  const result = await pool.query(
    `INSERT INTO leads (
       industry_id, service_id, subservice_id, state_id, city_id,
       customer_name, customer_phone, customer_email, requirement,
       property_type, budget, source, notes, custom_fields, pricing, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16)
     RETURNING *`,
    [
      industryId || null, serviceId || null, subserviceId || null, stateId || null, cityId || null,
      customerName || null, customerPhone || null, customerEmail || null, requirement || null,
      propertyType || null, budget ?? null, source || 'upload', notes || null,
      JSON.stringify(cleanJson(customFields)), JSON.stringify(cleanJson(pricing, DEFAULT_PRICING)), createdBy || null,
    ]
  );
  return result.rows[0];
}

const leadSelect = `
  SELECT l.*, i.name AS industry_name, s.name AS service_name, ss.name AS subservice_name,
         st.name AS state_name, c.name AS city_name
  FROM leads l
  LEFT JOIN industries i ON i.id = l.industry_id
  LEFT JOIN services s ON s.id = l.service_id
  LEFT JOIN subservices ss ON ss.id = l.subservice_id
  LEFT JOIN states st ON st.id = l.state_id
  LEFT JOIN cities c ON c.id = l.city_id`;

async function getLeadById(id) {
  const result = await pool.query(`${leadSelect} WHERE l.id = $1`, [id]);
  return result.rows[0] || null;
}

async function getLeads({ industryId, serviceId, subserviceId, stateId, cityId, status = 'available', userId, role }) {
  const values = [];
  const conditions = [];
  if (status) { values.push(status); conditions.push(`l.status = $${values.length}`); }
  if (industryId) { values.push(industryId); conditions.push(`l.industry_id = $${values.length}`); }
  if (serviceId) { values.push(serviceId); conditions.push(`l.service_id = $${values.length}`); }
  if (subserviceId) { values.push(subserviceId); conditions.push(`l.subservice_id = $${values.length}`); }
  if (stateId) { values.push(stateId); conditions.push(`l.state_id = $${values.length}`); }
  if (cityId) { values.push(cityId); conditions.push(`l.city_id = $${values.length}`); }

  if (role !== 'admin') {
    values.push(userId);
    conditions.push(`EXISTS (
      SELECT 1 FROM business_profiles bp
      JOIN business_profile_services bps ON bps.business_profile_id = bp.id
      WHERE bp.user_id = $${values.length} AND bps.is_active = TRUE
        AND bps.industry_id = l.industry_id AND bps.service_id = l.service_id
        AND (bps.subservice_id IS NULL OR bps.subservice_id = l.subservice_id)
    ) AND EXISTS (
      SELECT 1 FROM business_profiles bp
      JOIN business_profile_locations bpl ON bpl.business_profile_id = bp.id
      WHERE bp.user_id = $${values.length} AND bpl.is_active = TRUE
        AND bpl.state_id = l.state_id AND bpl.city_id = l.city_id
    )`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(`${leadSelect} ${where} ORDER BY l.created_at DESC`, values);
  return result.rows;
}

async function updateLead(id, data) {
  const {
    industryId, serviceId, subserviceId, stateId, cityId, customerName, customerPhone,
    customerEmail, requirement, propertyType, budget, source, status, notes, customFields, pricing,
  } = data;
  const result = await pool.query(
    `UPDATE leads SET industry_id=$1, service_id=$2, subservice_id=$3, state_id=$4, city_id=$5,
      customer_name=$6, customer_phone=$7, customer_email=$8, requirement=$9, property_type=$10,
      budget=$11, source=$12, status=$13, notes=$14, custom_fields=$15::jsonb, pricing=$16::jsonb,
      updated_at=CURRENT_TIMESTAMP WHERE id=$17 RETURNING *`,
    [industryId || null, serviceId || null, subserviceId || null, stateId || null, cityId || null,
      customerName || null, customerPhone || null, customerEmail || null, requirement || null,
      propertyType || null, budget ?? null, source || 'upload', status || 'available', notes || null,
      JSON.stringify(cleanJson(customFields)), JSON.stringify(cleanJson(pricing, DEFAULT_PRICING)), id]
  );
  return result.rows[0] || null;
}

async function updateLeadStatus(id, status) {
  const result = await pool.query(`UPDATE leads SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`, [status, id]);
  return result.rows[0] || null;
}

async function deleteLead(id) {
  const result = await pool.query(`DELETE FROM leads WHERE id=$1 RETURNING *`, [id]);
  return result.rows[0] || null;
}

async function getLeadPricing() {
  const result = await pool.query('SELECT * FROM lead_pricing WHERE id=1');
  return result.rows[0] || null;
}

module.exports = { createLead, getLeadById, getLeads, updateLead, updateLeadStatus, deleteLead, getLeadPricing };
