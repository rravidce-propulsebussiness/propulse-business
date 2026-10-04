BEGIN;

CREATE TABLE IF NOT EXISTS lead_entitlement_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  new_business_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  new_business_window_days INTEGER NOT NULL DEFAULT 7 CHECK (new_business_window_days BETWEEN 1 AND 365),
  new_business_shared_quantity INTEGER NOT NULL DEFAULT 1 CHECK (new_business_shared_quantity BETWEEN 0 AND 1000),
  new_business_premium_quantity INTEGER NOT NULL DEFAULT 0 CHECK (new_business_premium_quantity BETWEEN 0 AND 1000),
  claim_expiry_days INTEGER NOT NULL DEFAULT 0 CHECK (claim_expiry_days BETWEEN 0 AND 3650),
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO lead_entitlement_settings (
  id,new_business_enabled,new_business_window_days,
  new_business_shared_quantity,new_business_premium_quantity,claim_expiry_days
)
VALUES (1,FALSE,7,1,0,0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS lead_entitlement_grants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(30) NOT NULL CHECK (source IN ('admin','new_business')),
  shared_quantity INTEGER NOT NULL DEFAULT 0 CHECK (shared_quantity BETWEEN 0 AND 1000),
  premium_quantity INTEGER NOT NULL DEFAULT 0 CHECK (premium_quantity BETWEEN 0 AND 1000),
  starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  claim_expiry_days INTEGER NOT NULL DEFAULT 0 CHECK (claim_expiry_days BETWEEN 0 AND 3650),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (shared_quantity > 0 OR premium_quantity > 0),
  CHECK (expires_at IS NULL OR expires_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_entitlement_new_business_once
  ON lead_entitlement_grants(user_id)
  WHERE source='new_business';

CREATE INDEX IF NOT EXISTS idx_lead_entitlement_grants_user_active
  ON lead_entitlement_grants(user_id,starts_at,expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE lead_entitlement_claims
  ALTER COLUMN membership_id DROP NOT NULL;

ALTER TABLE lead_entitlement_claims
  ADD COLUMN IF NOT EXISTS grant_id INTEGER REFERENCES lead_entitlement_grants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lead_entitlement_claims_grant
  ON lead_entitlement_claims(grant_id,entitlement_type,claimed_at DESC);

COMMIT;
