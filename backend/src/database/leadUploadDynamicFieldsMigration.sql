-- Lead upload model: Basic/Premium are pricing tiers; Exclusive is an access flag.
-- Run after leadPricingTierMigration.sql.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing JSONB NOT NULL DEFAULT '{"shares":[{"shares":1,"normal":0,"pro":0},{"shares":3,"normal":0,"pro":0},{"shares":5,"normal":0,"pro":0}]}'::jsonb,
  ADD COLUMN IF NOT EXISTS lead_type VARCHAR(20) NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exclusive_delay_hours INTEGER NOT NULL DEFAULT 24;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_lead_type_check CHECK (lead_type IN ('basic','premium'));

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_exclusive_delay_hours_check;
ALTER TABLE leads ADD CONSTRAINT leads_exclusive_delay_hours_check CHECK (exclusive_delay_hours >= 0 AND exclusive_delay_hours <= 8760);

ALTER TABLE lead_pricing_rules
  ADD COLUMN IF NOT EXISTS lead_type VARCHAR(20) NOT NULL DEFAULT 'basic';

ALTER TABLE lead_pricing_rules DROP CONSTRAINT IF EXISTS lead_pricing_rules_lead_type_check;
ALTER TABLE lead_pricing_rules ADD CONSTRAINT lead_pricing_rules_lead_type_check CHECK (lead_type IN ('basic','premium'));

CREATE INDEX IF NOT EXISTS idx_leads_exclusive_access ON leads (is_exclusive, lead_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_custom_fields ON leads USING GIN (custom_fields);

-- Exclusive is deliberately NOT derived from old pricing data. Existing leads
-- remain non-exclusive until an admin explicitly marks them Exclusive.
-- Remove any legacy exclusive pricing keys while preserving Basic/Premium prices.
UPDATE leads SET pricing = pricing - 'exclusive' WHERE pricing ? 'exclusive';
UPDATE lead_pricing_rules SET pricing = pricing - 'exclusive' WHERE pricing ? 'exclusive';
