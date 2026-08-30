const pool = require('../config/database');

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

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

async function syncCitiesForState(stateId) {
  const stateResult = await pool.query(
    `SELECT id, name
     FROM states
     WHERE id = $1 AND is_active = TRUE`,
    [stateId]
  );

  const state = stateResult.rows[0];
  if (!state) return null;

  const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country: 'India', state: state.name }),
  });

  if (!response.ok) {
    throw new Error(`City provider returned ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error || !Array.isArray(payload.data)) {
    throw new Error(payload.msg || 'Could not fetch cities for this state');
  }

  const uniqueCities = [...new Set(payload.data.map((name) => String(name).trim()).filter(Boolean))];
  let added = 0;
  let restored = 0;
  let skipped = 0;

  for (const name of uniqueCities) {
    const slug = slugify(name);
    if (!slug) {
      skipped += 1;
      continue;
    }

    const existing = await pool.query(
      `SELECT id, is_active
       FROM cities
       WHERE state_id = $1 AND (LOWER(name) = LOWER($2) OR slug = $3)
       LIMIT 1`,
      [state.id, name, slug]
    );

    if (existing.rows[0]) {
      if (!existing.rows[0].is_active) {
        await pool.query(
          `UPDATE cities
           SET name = $1,
               slug = $2,
               is_active = TRUE,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [name, slug, existing.rows[0].id]
        );
        restored += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    await pool.query(
      `INSERT INTO cities (state_id, name, slug)
       VALUES ($1, $2, $3)`,
      [state.id, name, slug]
    );
    added += 1;
  }

  return {
    state,
    totalFromProvider: uniqueCities.length,
    added,
    restored,
    skipped,
  };
}

module.exports = {
  createCity,
  getCities,
  getCityById,
  updateCity,
  deactivateCity,
  syncCitiesForState,
};
