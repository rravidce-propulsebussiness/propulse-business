ALTER TABLE investments ADD COLUMN IF NOT EXISTS payout_transfer_reference VARCHAR(160);
ALTER TABLE investments ADD COLUMN IF NOT EXISTS payout_proof_url TEXT;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS payout_transferred_at TIMESTAMP;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS payout_transferred_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_investments_payout_transfer_reference
  ON investments (payout_transfer_reference)
  WHERE payout_transfer_reference IS NOT NULL AND BTRIM(payout_transfer_reference) <> '';
