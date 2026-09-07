-- Keep soft-deleted states and cities reusable while preserving uniqueness
-- among active records. This matches the existing is_active soft-delete model.

ALTER TABLE states ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE states ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE states DROP CONSTRAINT IF EXISTS states_name_key;
ALTER TABLE states DROP CONSTRAINT IF EXISTS states_code_key;
ALTER TABLE cities DROP CONSTRAINT IF EXISTS cities_state_id_name_key;
ALTER TABLE cities DROP CONSTRAINT IF EXISTS cities_state_id_slug_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_states_active_name
  ON states(name)
  WHERE is_active=TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_states_active_code
  ON states(code)
  WHERE is_active=TRUE AND code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cities_active_state_name
  ON cities(state_id,name)
  WHERE is_active=TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cities_active_state_slug
  ON cities(state_id,slug)
  WHERE is_active=TRUE;
