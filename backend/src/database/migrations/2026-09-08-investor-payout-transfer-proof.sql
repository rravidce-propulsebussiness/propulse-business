ALTER TABLE investments
  ADD COLUMN IF NOT EXISTS payout_transfer_reference VARCHAR(160),
  ADD COLUMN IF NOT EXISTS payout_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payout_transferred_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS payout_transferred_by INTEGER REFERENCES users(id);
