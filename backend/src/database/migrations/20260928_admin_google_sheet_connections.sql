CREATE TABLE IF NOT EXISTS admin_google_sheet_connections (
  id SERIAL PRIMARY KEY,
  spreadsheet_id VARCHAR(255) NOT NULL,
  gid VARCHAR(100) NOT NULL DEFAULT '0',
  source_url TEXT NOT NULL,
  defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  last_synced_at TIMESTAMP,
  last_checked_at TIMESTAMP,
  fingerprint VARCHAR(64),
  last_sync_created INTEGER NOT NULL DEFAULT 0 CHECK (last_sync_created >= 0),
  last_sync_updated INTEGER NOT NULL DEFAULT 0 CHECK (last_sync_updated >= 0),
  last_sync_unchanged INTEGER NOT NULL DEFAULT 0 CHECK (last_sync_unchanged >= 0),
  last_sync_failed INTEGER NOT NULL DEFAULT 0 CHECK (last_sync_failed >= 0),
  last_sync_failures JSONB NOT NULL DEFAULT '[]'::jsonb,
  sync_failure_count INTEGER NOT NULL DEFAULT 0 CHECK (sync_failure_count >= 0),
  last_sync_error_at TIMESTAMP,
  last_sync_error TEXT,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (spreadsheet_id, gid)
);

CREATE INDEX IF NOT EXISTS idx_admin_google_sheet_connections_status
  ON admin_google_sheet_connections(status, next_retry_at, id);
