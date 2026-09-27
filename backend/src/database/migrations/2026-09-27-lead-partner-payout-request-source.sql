ALTER TABLE lead_partner_payout_requests
  ADD COLUMN IF NOT EXISTS request_source VARCHAR(20) NOT NULL DEFAULT 'partner';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='chk_lp_payout_request_source'
  ) THEN
    ALTER TABLE lead_partner_payout_requests
      ADD CONSTRAINT chk_lp_payout_request_source
      CHECK (request_source IN ('partner','admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lp_payout_requests_source_status
  ON lead_partner_payout_requests(request_source,status,requested_at DESC);
