-- Add Basic/Premium segmentation to market pricing rules.
-- Existing rules remain BASIC so current pricing is preserved.
ALTER TABLE lead_pricing_rules
  ADD COLUMN IF NOT EXISTS lead_type VARCHAR(20) NOT NULL DEFAULT 'basic';

ALTER TABLE lead_pricing_rules
  DROP CONSTRAINT IF EXISTS lead_pricing_rules_lead_type_check;

ALTER TABLE lead_pricing_rules
  ADD CONSTRAINT lead_pricing_rules_lead_type_check
  CHECK (lead_type IN ('basic', 'premium'));

CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_market_type
  ON lead_pricing_rules (industry_id, city_id, lead_type, is_active);

-- Keep one active rule per market/type combination.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_pricing_rules_market_type
  ON lead_pricing_rules (
    COALESCE(industry_id, 0),
    COALESCE(city_id, 0),
    lead_type
  );

-- Store the pricing selected for each uploaded lead. Existing columns are
-- preserved; lead_type records whether the lead is Basic or Premium.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_type VARCHAR(20) NOT NULL DEFAULT 'basic';

ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_lead_type_check;

ALTER TABLE leads
  ADD CONSTRAINT leads_lead_type_check
  CHECK (lead_type IN ('basic', 'premium'));

CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads (lead_type);
