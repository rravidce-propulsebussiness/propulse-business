const pool = require('../config/database');

async function createCity({ stateId, name, slug }) {
  const result = await pool.query(
    `INSERT INTO cities (state_id, name, slug)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [stateId, name, slug]
  );

  return result.rows[0];
}

async function getCities() {
  const result = await pool.query(
    `SELECT c.*, s.name AS state_name, s.code AS state_code
     FROM cities c
     INNER JOIN states s ON s.id = c.state_id
     WHERE c.is_active = TRUE
       AND s.is_active = TRUE
     ORDER BY s.name ASC, c.name ASC`
  );

  return result.rows;
}

async function getCityById(id) {
  const result = await pool.query(
    `SELECT c.*, s.name AS state_name, s.code AS state_code
     FROM cities c
     INNER JOIN states s ON s.id = c.state_id
     WHERE c.id = $1
       AND c.is_active = TRUE
       AND s.is_active = TRUE`,
    [id]
  );

  return result.rows[0] || null;
}

async function updateCity(id, { stateId, name, slug }) {
  const result = await pool.query(
    `UPDATE cities
     SET state_id = $1,
         name = $2,
         slug = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 AND is_active = TRUE
     RETURNING *`,
    [stateId, name, slug, id]
  );

  return result.rows[0] || null;
}

async function deactivateCity(id) {
  const result = await pool.query(
    `UPDATE cities
     SET is_active = FALSE,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_active = TRUE
     RETURNING *`,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  createCity,
  getCities,
  getCityById,
  updateCity,
  deactivateCity,
};
