ALTER TABLE lead_partner_sheet_connections
  ADD COLUMN IF NOT EXISTS default_industry_id INTEGER REFERENCES industries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lead_partner_sheet_connections_default_industry
  ON lead_partner_sheet_connections(default_industry_id)
  WHERE default_industry_id IS NOT NULL;
