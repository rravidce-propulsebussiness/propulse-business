BEGIN;

ALTER TABLE investor_payout_requests
  ADD COLUMN IF NOT EXISTS payout_account_id INTEGER REFERENCES investor_payout_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payout_method VARCHAR(10),
  ADD COLUMN IF NOT EXISTS payout_account_snapshot JSONB;

CREATE INDEX IF NOT EXISTS investor_payout_requests_account_idx
  ON investor_payout_requests(payout_account_id);

COMMIT;
