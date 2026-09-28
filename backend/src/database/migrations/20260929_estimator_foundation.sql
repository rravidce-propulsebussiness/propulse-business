-- Phase 2: generic estimator foundation.
-- Estimator configuration is version-scoped so published historical estimates remain reproducible.

CREATE TABLE IF NOT EXISTS estimator_rate_items (
  id SERIAL PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES customer_flow_versions(id) ON DELETE CASCADE,
  rate_key VARCHAR(80) NOT NULL,
  label VARCHAR(240) NOT NULL,
  calculation_type VARCHAR(20) NOT NULL
    CHECK (calculation_type IN ('fixed','per_unit')),
  unit_question_key VARCHAR(80),
  amount_min NUMERIC(14,2) NOT NULL CHECK (amount_min >= 0),
  amount_max NUMERIC(14,2) NOT NULL CHECK (amount_max >= amount_min),
  show_when JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(version_id,rate_key),
  CHECK (rate_key ~ '^[a-z][a-z0-9_]{1,79}$'),
  CHECK (
    (calculation_type='fixed' AND unit_question_key IS NULL)
    OR
    (calculation_type='per_unit' AND unit_question_key ~ '^[a-z][a-z0-9_]{1,79}$')
  )
);

CREATE INDEX IF NOT EXISTS idx_estimator_rate_items_version_order
  ON estimator_rate_items(version_id,is_active,display_order,id);

CREATE TABLE IF NOT EXISTS estimator_adjustments (
  id SERIAL PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES customer_flow_versions(id) ON DELETE CASCADE,
  adjustment_key VARCHAR(80) NOT NULL,
  label VARCHAR(240) NOT NULL,
  adjustment_type VARCHAR(20) NOT NULL
    CHECK (adjustment_type IN ('fixed','percent')),
  value_min NUMERIC(14,2) NOT NULL,
  value_max NUMERIC(14,2) NOT NULL,
  city_id INTEGER REFERENCES cities(id) ON DELETE RESTRICT,
  show_when JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(version_id,adjustment_key),
  CHECK (adjustment_key ~ '^[a-z][a-z0-9_]{1,79}$'),
  CHECK (value_max >= value_min),
  CHECK (
    (adjustment_type='fixed' AND value_min >= 0)
    OR
    (adjustment_type='percent' AND value_min > -100 AND value_max <= 1000)
  )
);

CREATE INDEX IF NOT EXISTS idx_estimator_adjustments_version_order
  ON estimator_adjustments(version_id,is_active,display_order,id);

CREATE INDEX IF NOT EXISTS idx_estimator_adjustments_city
  ON estimator_adjustments(city_id,version_id)
  WHERE city_id IS NOT NULL AND is_active=TRUE;

CREATE TABLE IF NOT EXISTS estimator_calculations (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  definition_id INTEGER NOT NULL REFERENCES customer_flow_definitions(id) ON DELETE RESTRICT,
  version_id INTEGER NOT NULL REFERENCES customer_flow_versions(id) ON DELETE RESTRICT,
  city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
  pincode VARCHAR(10),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  config_snapshot JSONB NOT NULL,
  config_hash CHAR(64) NOT NULL,
  result_min NUMERIC(14,2) NOT NULL CHECK (result_min >= 0),
  result_max NUMERIC(14,2) NOT NULL CHECK (result_max >= result_min),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  converted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_estimator_calculations_flow_created
  ON estimator_calculations(definition_id,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_estimator_calculations_version_created
  ON estimator_calculations(version_id,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_estimator_calculations_lead
  ON estimator_calculations(lead_id)
  WHERE lead_id IS NOT NULL;
