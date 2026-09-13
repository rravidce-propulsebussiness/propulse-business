BEGIN;

CREATE TABLE IF NOT EXISTS investor_payout_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method VARCHAR(10) NOT NULL CHECK (method IN ('bank','upi')),
  account_holder_name VARCHAR(160),
  account_number VARCHAR(80),
  ifsc_code VARCHAR(20),
  bank_name VARCHAR(160),
  upi_id VARCHAR(160),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT investor_payout_accounts_method_fields CHECK (
    (method = 'bank' AND NULLIF(TRIM(account_holder_name), '') IS NOT NULL
      AND NULLIF(TRIM(account_number), '') IS NOT NULL
      AND NULLIF(TRIM(ifsc_code), '') IS NOT NULL
      AND NULLIF(TRIM(bank_name), '') IS NOT NULL
      AND upi_id IS NULL)
    OR
    (method = 'upi' AND NULLIF(TRIM(upi_id), '') IS NOT NULL
      AND account_holder_name IS NULL
      AND account_number IS NULL
      AND ifsc_code IS NULL
      AND bank_name IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS investor_payout_accounts_one_active_per_user
  ON investor_payout_accounts(user_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS investor_payout_accounts_user_idx
  ON investor_payout_accounts(user_id, is_active);

COMMIT;
