const pool = require('../config/database');

async function createState({ name, code }) {
  const result = await pool.query(
    `INSERT INTO states (name, code)
     VALUES ($1, $2)
     RETURNING *`,
    [name, code || null]
  );

  return result.rows[0];
}

async function getStates() {
  const result = await pool.query(
    `SELECT *
     FROM states
     WHERE is_active = TRUE
     ORDER BY name ASC`
  );

  return result.rows;
}

async function getStateById(id) {
  const result = await pool.query(
    `SELECT *
     FROM states
     WHERE id = $1 AND is_active = TRUE`,
    [id]
  );

  return result.rows[0] || null;
}

async function updateState(id, { name, code }) {
  const result = await pool.query(
    `UPDATE states
     SET name = $1,
         code = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND is_active = TRUE
     RETURNING *`,
    [name, code || null, id]
  );

  return result.rows[0] || null;
}

async function deactivateState(id) {
  const result = await pool.query(
    `UPDATE states
     SET is_active = FALSE,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_active = TRUE
     RETURNING *`,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  createState,
  getStates,
  getStateById,
  updateState,
  deactivateState,
};
