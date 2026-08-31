-- Configurable lead pricing by industry + city.
CREATE TABLE IF NOT EXISTS lead_pricing_rules (
  id SERIAL PRIMARY KEY,
  industry_id INTEGER REFERENCES industries(id) ON DELETE CASCADE,
  city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
  pricing JSONB NOT NULL DEFAULT '{"shares":[{"shares":1,"normal":0,"pro":0},{"shares":3,"normal":0,"pro":0},{"shares":5,"normal":0,"pro":0}]}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT lead_pricing_rules_unique_scope UNIQUE (industry_id, city_id)
);
CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_industry ON lead_pricing_rules(industry_id);
CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_city ON lead_pricing_rules(city_id);
CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_active ON lead_pricing_rules(is_active);
