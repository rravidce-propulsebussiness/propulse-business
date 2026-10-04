BEGIN;

CREATE TABLE IF NOT EXISTS lead_partner_pricing_rules (
  id SERIAL PRIMARY KEY,
  partner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  industry_id INTEGER REFERENCES industries(id) ON DELETE RESTRICT,
  city_id INTEGER REFERENCES cities(id) ON DELETE RESTRICT,
  lead_type VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (lead_type IN ('basic','premium')),
  pricing JSONB NOT NULL DEFAULT '{"shares":[]}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_partner_pricing_scope
  ON lead_partner_pricing_rules(partner_user_id,COALESCE(industry_id,0),COALESCE(city_id,0),lead_type);
CREATE INDEX IF NOT EXISTS idx_lead_partner_pricing_rules_partner ON lead_partner_pricing_rules(partner_user_id,is_active);

COMMIT;
