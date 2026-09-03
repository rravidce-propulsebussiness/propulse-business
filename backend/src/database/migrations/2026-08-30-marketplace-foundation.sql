BEGIN;

-- Canonical marketplace foundation. This replaces the old ad-hoc lead
-- marketplace migration chain with one ordered, tracked migration.
ALTER TABLE leads
  ALTER COLUMN industry_id DROP NOT NULL,
  ALTER COLUMN service_id DROP NOT NULL,
  ALTER COLUMN state_id DROP NOT NULL,
  ALTER COLUMN city_id DROP NOT NULL,
  ALTER COLUMN customer_name DROP NOT NULL,
  ALTER COLUMN customer_phone DROP NOT NULL,
  ALTER COLUMN requirement DROP NOT NULL,
  ALTER COLUMN source DROP NOT NULL;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing JSONB NOT NULL DEFAULT '{"shares":[{"shares":1,"normal":0,"pro":0},{"shares":3,"normal":0,"pro":0},{"shares":5,"normal":0,"pro":0}]}'::jsonb,
  ADD COLUMN IF NOT EXISTS lead_type VARCHAR(20) NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exclusive_delay_days INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS exclusive_delay_hours INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS buyer_capacity INTEGER NOT NULL DEFAULT 1;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_lead_type_check CHECK (lead_type IN ('basic','premium'));
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_exclusive_delay_days_check;
ALTER TABLE leads ADD CONSTRAINT leads_exclusive_delay_days_check CHECK (exclusive_delay_days >= 0 AND exclusive_delay_days <= 365);
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_exclusive_delay_hours_check;
ALTER TABLE leads ADD CONSTRAINT leads_exclusive_delay_hours_check CHECK (exclusive_delay_hours >= 0 AND exclusive_delay_hours <= 8760);
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_buyer_capacity_check;
ALTER TABLE leads ADD CONSTRAINT leads_buyer_capacity_check CHECK (buyer_capacity > 0);

CREATE INDEX IF NOT EXISTS idx_leads_custom_fields ON leads USING GIN(custom_fields);
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_exclusive_access ON leads(is_exclusive, lead_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_buyer_capacity ON leads(buyer_capacity);

CREATE TABLE IF NOT EXISTS lead_pricing_rules (
  id SERIAL PRIMARY KEY,
  industry_id INTEGER REFERENCES industries(id) ON DELETE CASCADE,
  city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
  pricing JSONB NOT NULL DEFAULT '{"shares":[{"shares":1,"normal":0,"pro":0},{"shares":3,"normal":0,"pro":0},{"shares":5,"normal":0,"pro":0}]}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  lead_type VARCHAR(20) NOT NULL DEFAULT 'basic',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE lead_pricing_rules DROP CONSTRAINT IF EXISTS lead_pricing_rules_lead_type_check;
ALTER TABLE lead_pricing_rules ADD CONSTRAINT lead_pricing_rules_lead_type_check CHECK (lead_type IN ('basic','premium'));
DROP INDEX IF EXISTS uq_lead_pricing_rules_market_type;
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_pricing_rules_market_type
  ON lead_pricing_rules(COALESCE(industry_id,0),COALESCE(city_id,0),lead_type);
CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_industry ON lead_pricing_rules(industry_id);
CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_city ON lead_pricing_rules(city_id);
CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_active ON lead_pricing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_market_type ON lead_pricing_rules(industry_id,city_id,lead_type,is_active);

CREATE TABLE IF NOT EXISTS lead_pricing (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  normal_one_share NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (normal_one_share >= 0),
  normal_three_shares NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (normal_three_shares >= 0),
  normal_five_shares NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (normal_five_shares >= 0),
  pro_one_share NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (pro_one_share >= 0),
  pro_three_shares NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (pro_three_shares >= 0),
  pro_five_shares NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (pro_five_shares >= 0),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO lead_pricing(id) VALUES (1) ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS lead_purchases (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shares INTEGER NOT NULL CHECK (shares > 0),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  pricing_tier VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (pricing_tier IN ('normal','pro')),
  status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','refunded','cancelled')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_lead ON lead_purchases(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_user ON lead_purchases(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_purchases_active_user ON lead_purchases(lead_id,user_id) WHERE status='paid';

COMMIT;
