BEGIN;

CREATE TABLE IF NOT EXISTS lead_partner_payout_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method VARCHAR(10) NOT NULL CHECK (method IN ('bank','upi')),
  account_holder_name VARCHAR(160),
  account_number TEXT,
  ifsc_code VARCHAR(11),
  bank_name VARCHAR(160),
  upi_id VARCHAR(255),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (method='bank' AND account_holder_name IS NOT NULL AND account_number IS NOT NULL AND ifsc_code IS NOT NULL AND bank_name IS NOT NULL AND upi_id IS NULL)
    OR
    (method='upi' AND upi_id IS NOT NULL AND account_holder_name IS NULL AND account_number IS NULL AND ifsc_code IS NULL AND bank_name IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_lead_partner_payout_accounts_user ON lead_partner_payout_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_partner_payout_accounts_active ON lead_partner_payout_accounts(user_id,is_active);

COMMIT;
