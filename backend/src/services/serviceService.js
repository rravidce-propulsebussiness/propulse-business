const pool = require('../config/database');

async function createService({ industryId, name, slug, description }) {
  const result = await pool.query(
    `INSERT INTO services (industry_id, name, slug, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [industryId, name, slug, description || null]
  );

  return result.rows[0];
}

async function getServices() {
  const result = await pool.query(
    `SELECT s.*, i.name AS industry_name
     FROM services s
     INNER JOIN industries i ON i.id = s.industry_id
     WHERE s.is_active = TRUE
       AND i.is_active = TRUE
     ORDER BY i.name ASC, s.name ASC`
  );

  return result.rows;
}

async function getServiceById(id) {
  const result = await pool.query(
    `SELECT s.*, i.name AS industry_name
     FROM services s
     INNER JOIN industries i ON i.id = s.industry_id
     WHERE s.id = $1
       AND s.is_active = TRUE
       AND i.is_active = TRUE`,
    [id]
  );

  return result.rows[0] || null;
}

async function updateService(id, { industryId, name, slug, description }) {
  const result = await pool.query(
    `UPDATE services
     SET industry_id = $1,
         name = $2,
         slug = $3,
         description = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5 AND is_active = TRUE
     RETURNING *`,
    [industryId, name, slug, description || null, id]
  );

  return result.rows[0] || null;
}

async function deactivateService(id) {
  const result = await pool.query(
    `UPDATE services
     SET is_active = FALSE,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_active = TRUE
     RETURNING *`,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  createService,
  getServices,
  getServiceById,
  updateService,
  deactivateService,
};
