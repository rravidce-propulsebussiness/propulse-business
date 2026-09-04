const pool = require('../config/database');

async function createIndustry({ name, slug, description }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock any existing row matching either unique identity so a delete/recreate
    // operation restores the same record instead of creating a duplicate.
    const existing = await client.query(
      `SELECT *
       FROM industries
       WHERE name = $1 OR slug = $2
       FOR UPDATE`,
      [name, slug]
    );

    if (existing.rows.length) {
      const row = existing.rows[0];

      if (row.is_active) {
        const error = new Error('An industry with this name or slug already exists');
        error.code = 'DUPLICATE_INDUSTRY';
        error.status = 409;
        throw error;
      }

      const restored = await client.query(
        `UPDATE industries
         SET name = $1,
             slug = $2,
             description = $3,
             is_active = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [name, slug, description || null, row.id]
      );

      await client.query('COMMIT');
      return restored.rows[0];
    }

    const result = await client.query(
      `INSERT INTO industries (name, slug, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, slug, description || null]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
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
