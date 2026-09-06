BEGIN;

CREATE TABLE IF NOT EXISTS investor_location_limits (
  id SERIAL PRIMARY KEY,
  state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
  investor_limit NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (investor_limit >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS investor_location_limits_scope_uq
  ON investor_location_limits (state_id, COALESCE(city_id, 0));
CREATE INDEX IF NOT EXISTS idx_investor_location_limits_active
  ON investor_location_limits (state_id, city_id, is_active);

ALTER TABLE investments ADD COLUMN IF NOT EXISTS state_id INTEGER REFERENCES states(id) ON DELETE RESTRICT;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_investments_location_status ON investments(state_id, city_id, status);

COMMIT;
