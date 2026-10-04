BEGIN;

CREATE TABLE IF NOT EXISTS lead_entitlement_registration_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  verification_scope VARCHAR(20) NOT NULL DEFAULT 'verified'
    CHECK (verification_scope IN ('any','verified','unverified')),
  industry_id INTEGER REFERENCES industries(id) ON DELETE SET NULL,
  state_id INTEGER REFERENCES states(id) ON DELETE SET NULL,
  city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
  window_days INTEGER NOT NULL DEFAULT 7 CHECK (window_days BETWEEN 1 AND 365),
  shared_quantity INTEGER NOT NULL DEFAULT 1 CHECK (shared_quantity BETWEEN 0 AND 1000),
  premium_quantity INTEGER NOT NULL DEFAULT 0 CHECK (premium_quantity BETWEEN 0 AND 1000),
  claim_expiry_days INTEGER NOT NULL DEFAULT 0 CHECK (claim_expiry_days BETWEEN 0 AND 3650),
  allow_single BOOLEAN NOT NULL DEFAULT TRUE,
  allow_shared BOOLEAN NOT NULL DEFAULT TRUE,
  allow_auto_release BOOLEAN NOT NULL DEFAULT TRUE,
  allow_exclusive BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (NOT is_active OR shared_quantity > 0 OR premium_quantity > 0),
  CHECK (NOT is_active OR allow_single OR allow_shared OR allow_auto_release)
);

CREATE INDEX IF NOT EXISTS idx_lead_entitlement_registration_rules_active
  ON lead_entitlement_registration_rules(is_active,industry_id,state_id,city_id);

ALTER TABLE lead_entitlement_grants
  ADD COLUMN IF NOT EXISTS registration_rule_id INTEGER
  REFERENCES lead_entitlement_registration_rules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lead_entitlement_grants_registration_rule
  ON lead_entitlement_grants(registration_rule_id)
  WHERE registration_rule_id IS NOT NULL;

WITH legacy AS (
  SELECT s.*
  FROM lead_entitlement_settings s
  WHERE s.id=1
    AND (s.updated_by IS NOT NULL OR s.new_business_enabled=TRUE)
),
inserted AS (
  INSERT INTO lead_entitlement_registration_rules(
    name,is_active,verification_scope,
    window_days,shared_quantity,premium_quantity,claim_expiry_days,
    allow_single,allow_shared,allow_auto_release,allow_exclusive,
    created_by,updated_by,created_at,updated_at
  )
  SELECT
    'Default registration rule',
    l.new_business_enabled,
    'verified',
    l.new_business_window_days,
    l.new_business_shared_quantity,
    l.new_business_premium_quantity,
    l.claim_expiry_days,
    COALESCE(l.new_business_allow_single,TRUE),
    COALESCE(l.new_business_allow_shared,TRUE),
    COALESCE(l.new_business_allow_auto_release,TRUE),
    COALESCE(l.new_business_allow_exclusive,FALSE),
    l.updated_by,l.updated_by,l.created_at,l.updated_at
  FROM legacy l
  WHERE NOT EXISTS (
    SELECT 1 FROM lead_entitlement_registration_rules r
    WHERE r.name='Default registration rule'
  )
  RETURNING id
)
UPDATE lead_entitlement_grants g
SET registration_rule_id=(
  SELECT id FROM lead_entitlement_registration_rules
  WHERE name='Default registration rule'
  ORDER BY id
  LIMIT 1
)
WHERE g.source='new_business'
  AND g.registration_rule_id IS NULL
  AND EXISTS (SELECT 1 FROM legacy);

COMMIT;
