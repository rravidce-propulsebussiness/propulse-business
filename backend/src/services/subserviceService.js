const pool = require('../config/database');

async function createSubservice({ serviceId, name, slug, description }) {
  const result = await pool.query(
    `INSERT INTO subservices (service_id, name, slug, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [serviceId, name, slug, description || null]
  );

  return result.rows[0];
}

async function getSubservices() {
  const result = await pool.query(
    `SELECT ss.*, s.name AS service_name, i.name AS industry_name
     FROM subservices ss
     INNER JOIN services s ON s.id = ss.service_id
     INNER JOIN industries i ON i.id = s.industry_id
     WHERE ss.is_active = TRUE
       AND s.is_active = TRUE
       AND i.is_active = TRUE
     ORDER BY i.name ASC, s.name ASC, ss.name ASC`
  );

  return result.rows;
}

async function getSubserviceById(id) {
  const result = await pool.query(
    `SELECT ss.*, s.name AS service_name, i.name AS industry_name
     FROM subservices ss
     INNER JOIN services s ON s.id = ss.service_id
     INNER JOIN industries i ON i.id = s.industry_id
     WHERE ss.id = $1
       AND ss.is_active = TRUE
       AND s.is_active = TRUE
       AND i.is_active = TRUE`,
    [id]
  );

  return result.rows[0] || null;
}

async function updateSubservice(id, { serviceId, name, slug, description }) {
  const result = await pool.query(
    `UPDATE subservices
     SET service_id = $1,
         name = $2,
         slug = $3,
         description = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5 AND is_active = TRUE
     RETURNING *`,
    [serviceId, name, slug, description || null, id]
  );

  return result.rows[0] || null;
}

async function deactivateSubservice(id) {
  const result = await pool.query(
    `UPDATE subservices
     SET is_active = FALSE,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_active = TRUE
     RETURNING *`,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  createSubservice,
  getSubservices,
  getSubserviceById,
  updateSubservice,
  deactivateSubservice,
};
