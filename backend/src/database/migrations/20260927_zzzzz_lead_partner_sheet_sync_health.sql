ALTER TABLE lead_partner_sheet_connections
  ADD COLUMN IF NOT EXISTS sync_failure_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sync_error_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP;

ALTER TABLE lead_partner_sheet_connections
  DROP CONSTRAINT IF EXISTS lead_partner_sheet_connections_sync_failure_count_check;

ALTER TABLE lead_partner_sheet_connections
  ADD CONSTRAINT lead_partner_sheet_connections_sync_failure_count_check
  CHECK (sync_failure_count >= 0);

CREATE INDEX IF NOT EXISTS idx_lead_partner_sheet_connections_retry
  ON lead_partner_sheet_connections(status, next_retry_at, id);
