const pool = require('../config/database');

async function createIndustry({ name, slug, description }) {
  const result = await pool.query(
    `INSERT INTO industries (name, slug, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, slug, description || null]
  );

  return result.rows[0];
}

async function getIndustries() {
  const result = await pool.query(
    `SELECT *
     FROM industries
     WHERE is_active = TRUE
     ORDER BY name ASC`
  );

  return result.rows;
}

async function getIndustryById(id) {
  const result = await pool.query(
    `SELECT *
     FROM industries
     WHERE id = $1 AND is_active = TRUE`,
    [id]
  );

  return result.rows[0] || null;
}

async function updateIndustry(id, { name, slug, description }) {
  const result = await pool.query(
    `UPDATE industries
     SET name = $1,
         slug = $2,
         description = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 AND is_active = TRUE
     RETURNING *`,
    [name, slug, description || null, id]
  );

  return result.rows[0] || null;
}

async function deactivateIndustry(id) {
  const result = await pool.query(
    `UPDATE industries
     SET is_active = FALSE,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_active = TRUE
     RETURNING *`,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  createIndustry,
  getIndustries,
  getIndustryById,
  updateIndustry,
  deactivateIndustry,
};
