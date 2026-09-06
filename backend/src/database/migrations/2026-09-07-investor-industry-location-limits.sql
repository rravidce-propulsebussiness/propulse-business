BEGIN;

CREATE TABLE IF NOT EXISTS investor_industry_location_limits (
  id SERIAL PRIMARY KEY,
  industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
  investor_limit INTEGER NOT NULL DEFAULT 0 CHECK (investor_limit >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE investor_industry_location_limits
  ALTER COLUMN investor_limit TYPE INTEGER
  USING ROUND(investor_limit)::INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS investor_industry_location_scope_uq
  ON investor_industry_location_limits (industry_id, state_id, COALESCE(city_id, 0));
CREATE INDEX IF NOT EXISTS idx_investor_industry_location_active
  ON investor_industry_location_limits (industry_id, state_id, city_id, is_active);

COMMIT;
