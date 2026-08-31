-- Lead tiers: Basic, Premium and Exclusive.
-- Existing rows remain Basic so current data continues to work.
ALTER TABLE lead_pricing_rules ADD COLUMN IF NOT EXISTS lead_type VARCHAR(20) NOT NULL DEFAULT 'basic';
ALTER TABLE lead_pricing_rules DROP CONSTRAINT IF EXISTS lead_pricing_rules_lead_type_check;
ALTER TABLE lead_pricing_rules ADD CONSTRAINT lead_pricing_rules_lead_type_check CHECK (lead_type IN ('basic','premium','exclusive'));
CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_market_type ON lead_pricing_rules (industry_id,city_id,lead_type,is_active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_pricing_rules_market_type ON lead_pricing_rules (COALESCE(industry_id,0),COALESCE(city_id,0),lead_type);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_type VARCHAR(20) NOT NULL DEFAULT 'basic';
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_lead_type_check CHECK (lead_type IN ('basic','premium','exclusive'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS exclusive_delay_hours INTEGER NOT NULL DEFAULT 24;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_exclusive_delay_hours_check;
ALTER TABLE leads ADD CONSTRAINT leads_exclusive_delay_hours_check CHECK (exclusive_delay_hours >= 0 AND exclusive_delay_hours <= 8760);
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads (lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_exclusive_delay ON leads (lead_type,created_at,exclusive_delay_hours);

-- Lead upload fields are optional. Foreign keys still protect any values that are supplied.
ALTER TABLE leads ALTER COLUMN industry_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN service_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN state_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN city_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN customer_phone DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN requirement DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN source DROP NOT NULL;
