const pool = require('../config/database');

async function createLead({
  industryId,
  serviceId,
  subserviceId,
  stateId,
  cityId,
  customerName,
  customerPhone,
  customerEmail,
  requirement,
  propertyType,
  budget,
  source,
  notes,
  createdBy,
}) {
  const result = await pool.query(
    `INSERT INTO leads (
       industry_id, service_id, subservice_id, state_id, city_id,
       customer_name, customer_phone, customer_email, requirement,
       property_type, budget, source, notes, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      industryId,
      serviceId,
      subserviceId || null,
      stateId,
      cityId,
      customerName,
      customerPhone,
      customerEmail || null,
      requirement,
      propertyType || null,
      budget || null,
      source || 'manual',
      notes || null,
      createdBy || null,
    ]
  );

  return result.rows[0];
}

async function getLeadById(id) {
  const result = await pool.query(
    `SELECT l.*,
            i.name AS industry_name,
            s.name AS service_name,
            ss.name AS subservice_name,
            st.name AS state_name,
            c.name AS city_name
     FROM leads l
     JOIN industries i ON i.id = l.industry_id
     JOIN services s ON s.id = l.service_id
     LEFT JOIN subservices ss ON ss.id = l.subservice_id
     JOIN states st ON st.id = l.state_id
     JOIN cities c ON c.id = l.city_id
     WHERE l.id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

async function getLeads({
  industryId,
  serviceId,
  subserviceId,
  stateId,
  cityId,
  status = 'available',
}) {
  const values = [];
  const conditions = [];

  if (status) {
    values.push(status);
    conditions.push(`l.status = $${values.length}`);
  }
  if (industryId) {
    values.push(industryId);
    conditions.push(`l.industry_id = $${values.length}`);
  }
  if (serviceId) {
    values.push(serviceId);
    conditions.push(`l.service_id = $${values.length}`);
  }
  if (subserviceId) {
    values.push(subserviceId);
    conditions.push(`l.subservice_id = $${values.length}`);
  }
  if (stateId) {
    values.push(stateId);
    conditions.push(`l.state_id = $${values.length}`);
  }
  if (cityId) {
    values.push(cityId);
    conditions.push(`l.city_id = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT l.*,
            i.name AS industry_name,
            s.name AS service_name,
            ss.name AS subservice_name,
            st.name AS state_name,
            c.name AS city_name
     FROM leads l
     JOIN industries i ON i.id = l.industry_id
     JOIN services s ON s.id = l.service_id
     LEFT JOIN subservices ss ON ss.id = l.subservice_id
     JOIN states st ON st.id = l.state_id
     JOIN cities c ON c.id = l.city_id
     ${where}
     ORDER BY l.created_at DESC`,
    values
  );

  return result.rows;
}

async function updateLead(id, {
  industryId,
  serviceId,
  subserviceId,
  stateId,
  cityId,
  customerName,
  customerPhone,
  customerEmail,
  requirement,
  propertyType,
  budget,
  source,
  status,
  notes,
}) {
  const result = await pool.query(
    `UPDATE leads
     SET industry_id = $1,
         service_id = $2,
         subservice_id = $3,
         state_id = $4,
         city_id = $5,
         customer_name = $6,
         customer_phone = $7,
         customer_email = $8,
         requirement = $9,
         property_type = $10,
         budget = $11,
         source = $12,
         status = $13,
         notes = $14,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $15
     RETURNING *`,
    [
      industryId,
      serviceId,
      subserviceId || null,
      stateId,
      cityId,
      customerName,
      customerPhone,
      customerEmail || null,
      requirement,
      propertyType || null,
      budget || null,
      source || 'manual',
      status || 'available',
      notes || null,
      id,
    ]
  );

  return result.rows[0] || null;
}

async function updateLeadStatus(id, status) {
  const result = await pool.query(
    `UPDATE leads
     SET status = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );

  return result.rows[0] || null;
}

module.exports = {
  createLead,
  getLeadById,
  getLeads,
  updateLead,
  updateLeadStatus,
};
