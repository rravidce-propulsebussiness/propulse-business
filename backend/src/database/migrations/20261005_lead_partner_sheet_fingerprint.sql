ALTER TABLE lead_partner_sheet_connections
  ADD COLUMN IF NOT EXISTS fingerprint CHAR(64);

CREATE INDEX IF NOT EXISTS idx_lead_partner_sheet_connections_fingerprint
  ON lead_partner_sheet_connections(fingerprint)
  WHERE fingerprint IS NOT NULL;
