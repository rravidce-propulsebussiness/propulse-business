ALTER TABLE admin_google_sheet_connections
  ADD COLUMN IF NOT EXISTS default_industry_id INTEGER REFERENCES industries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_google_sheet_connections_default_industry
  ON admin_google_sheet_connections(default_industry_id)
  WHERE default_industry_id IS NOT NULL;
