-- Lead marketplace upgrade: optional classification/contact fields, dynamic details and 3+3 share pricing.
ALTER TABLE leads ALTER COLUMN industry_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN service_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN state_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN city_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN customer_phone DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN requirement DROP NOT NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pricing JSONB NOT NULL DEFAULT '{"normal":{"oneShare":0,"threeShares":0,"fiveShares":0},"pro":{"oneShare":0,"threeShares":0,"fiveShares":0}}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_leads_custom_fields ON leads USING GIN(custom_fields);

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
INSERT INTO lead_pricing (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
