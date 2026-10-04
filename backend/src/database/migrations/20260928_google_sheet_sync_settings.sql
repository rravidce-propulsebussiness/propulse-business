CREATE TABLE IF NOT EXISTS google_sheet_sync_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  admin_sources_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  lead_partner_sources_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  interval_minutes INTEGER NOT NULL DEFAULT 5 CHECK (interval_minutes BETWEEN 1 AND 1440),
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO google_sheet_sync_settings(id)
VALUES(1)
ON CONFLICT(id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_google_sheet_sync_settings_updated
  ON google_sheet_sync_settings(updated_at DESC);
