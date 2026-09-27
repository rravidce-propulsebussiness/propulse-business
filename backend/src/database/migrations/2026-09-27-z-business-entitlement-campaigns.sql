BEGIN;

CREATE TABLE IF NOT EXISTS lead_entitlement_business_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  audience_scope VARCHAR(24) NOT NULL DEFAULT 'all'
    CHECK (audience_scope IN ('all','specific_users')),
  verification_scope VARCHAR(20) NOT NULL DEFAULT 'any'
    CHECK (verification_scope IN ('any','verified','unverified')),
  industry_id INTEGER REFERENCES industries(id) ON DELETE SET NULL,
  state_id INTEGER REFERENCES states(id) ON DELETE SET NULL,
  city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
  shared_quantity INTEGER NOT NULL DEFAULT 1 CHECK (shared_quantity BETWEEN 0 AND 1000),
  premium_quantity INTEGER NOT NULL DEFAULT 0 CHECK (premium_quantity BETWEEN 0 AND 1000),
  valid_days INTEGER NOT NULL DEFAULT 30 CHECK (valid_days BETWEEN 0 AND 3650),
  claim_expiry_days INTEGER NOT NULL DEFAULT 0 CHECK (claim_expiry_days BETWEEN 0 AND 3650),
  allow_single BOOLEAN NOT NULL DEFAULT TRUE,
  allow_shared BOOLEAN NOT NULL DEFAULT TRUE,
  allow_auto_release BOOLEAN NOT NULL DEFAULT TRUE,
  allow_exclusive BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (shared_quantity > 0 OR premium_quantity > 0),
  CHECK (allow_single OR allow_shared OR allow_auto_release)
);

CREATE TABLE IF NOT EXISTS lead_entitlement_business_campaign_users (
  campaign_id INTEGER NOT NULL REFERENCES lead_entitlement_business_campaigns(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(campaign_id,user_id)
);

ALTER TABLE lead_entitlement_grants
  DROP CONSTRAINT IF EXISTS lead_entitlement_grants_source_check;

ALTER TABLE lead_entitlement_grants
  ADD CONSTRAINT lead_entitlement_grants_source_check
  CHECK (source IN ('admin','new_business','campaign'));

ALTER TABLE lead_entitlement_grants
  ADD COLUMN IF NOT EXISTS campaign_id INTEGER
  REFERENCES lead_entitlement_business_campaigns(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_entitlement_campaign_user
  ON lead_entitlement_grants(campaign_id,user_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_entitlement_business_campaign_target
  ON lead_entitlement_business_campaigns(verification_scope,industry_id,state_id,city_id);

CREATE INDEX IF NOT EXISTS idx_lead_entitlement_business_campaign_users_user
  ON lead_entitlement_business_campaign_users(user_id,campaign_id);

COMMIT;
