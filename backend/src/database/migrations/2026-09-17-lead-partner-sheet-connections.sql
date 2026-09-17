CREATE TABLE IF NOT EXISTS lead_partner_sheet_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spreadsheet_id VARCHAR(255) NOT NULL,
  gid VARCHAR(100) NOT NULL DEFAULT '0',
  source_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  last_synced_at TIMESTAMP,
  last_sync_created INTEGER NOT NULL DEFAULT 0 CHECK (last_sync_created >= 0),
  last_sync_duplicate INTEGER NOT NULL DEFAULT 0 CHECK (last_sync_duplicate >= 0),
  last_sync_failed INTEGER NOT NULL DEFAULT 0 CHECK (last_sync_failed >= 0),
  last_sync_failures JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, spreadsheet_id, gid)
);

CREATE INDEX IF NOT EXISTS idx_lead_partner_sheet_connections_user
  ON lead_partner_sheet_connections(user_id, status, updated_at DESC);
