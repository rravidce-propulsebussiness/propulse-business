ALTER TABLE admin_google_sheet_connections
  ADD COLUMN IF NOT EXISTS column_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_preview_summary JSONB,
  ADD COLUMN IF NOT EXISTS last_previewed_at TIMESTAMP;

ALTER TABLE lead_partner_sheet_connections
  ADD COLUMN IF NOT EXISTS column_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_preview_summary JSONB,
  ADD COLUMN IF NOT EXISTS last_previewed_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS google_sheet_import_previews (
  token_hash CHAR(64) PRIMARY KEY,
  actor_type VARCHAR(24) NOT NULL CHECK (actor_type IN ('admin','lead_partner')),
  actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spreadsheet_id VARCHAR(255) NOT NULL,
  gid VARCHAR(100) NOT NULL DEFAULT '0',
  source_url TEXT NOT NULL,
  fingerprint CHAR(64) NOT NULL,
  defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
  column_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_google_sheet_import_previews_actor
  ON google_sheet_import_previews(actor_type,actor_user_id,expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_google_sheet_import_previews_expiry
  ON google_sheet_import_previews(expires_at)
  WHERE consumed_at IS NULL;
