-- Pricing rules are scoped by market AND lead tier.
-- The historical (industry_id, city_id) uniqueness prevented separate Basic/Premium rules.
ALTER TABLE lead_pricing_rules DROP CONSTRAINT IF EXISTS lead_pricing_rules_unique_scope;
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_pricing_rules_market_type
  ON lead_pricing_rules (COALESCE(industry_id,0), COALESCE(city_id,0), lead_type);
