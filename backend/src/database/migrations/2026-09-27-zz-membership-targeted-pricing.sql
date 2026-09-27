BEGIN;

CREATE TABLE IF NOT EXISTS membership_pricing_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  plan_group VARCHAR(20) NOT NULL
    CHECK (plan_group IN ('grow','scale')),
  audience_scope VARCHAR(24) NOT NULL DEFAULT 'all'
    CHECK (audience_scope IN ('all','specific_users')),
  verification_scope VARCHAR(20) NOT NULL DEFAULT 'any'
    CHECK (verification_scope IN ('any','verified','unverified')),
  industry_id INTEGER REFERENCES industries(id) ON DELETE SET NULL,
  state_id INTEGER REFERENCES states(id) ON DELETE SET NULL,
  city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
  priority INTEGER NOT NULL DEFAULT 100
    CHECK (priority BETWEEN 0 AND 10000),
  period_overrides JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS membership_pricing_rule_users (
  rule_id INTEGER NOT NULL REFERENCES membership_pricing_rules(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(rule_id,user_id)
);

CREATE INDEX IF NOT EXISTS idx_membership_pricing_rules_target
  ON membership_pricing_rules(is_active,plan_group,verification_scope,industry_id,state_id,city_id,priority DESC);

CREATE INDEX IF NOT EXISTS idx_membership_pricing_rule_users_user
  ON membership_pricing_rule_users(user_id,rule_id);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS membership_pricing_rule_id INTEGER
  REFERENCES membership_pricing_rules(id) ON DELETE SET NULL;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS membership_lead_entitlements JSONB;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS membership_effective_price NUMERIC(12,2);

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS pricing_rule_id INTEGER
  REFERENCES membership_pricing_rules(id) ON DELETE SET NULL;

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS effective_price NUMERIC(12,2);

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS lead_entitlements_snapshot JSONB;

UPDATE memberships m
SET effective_price=COALESCE(m.effective_price,mp.price),
    lead_entitlements_snapshot=COALESCE(m.lead_entitlements_snapshot,mp.lead_entitlements)
FROM membership_plans mp
WHERE mp.id=m.membership_plan_id
  AND (m.effective_price IS NULL OR m.lead_entitlements_snapshot IS NULL);

COMMIT;
