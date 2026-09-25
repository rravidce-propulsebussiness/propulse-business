CREATE TABLE IF NOT EXISTS investment_payment_drafts (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  industry_id INTEGER NOT NULL REFERENCES industries(id),
  state_id INTEGER REFERENCES states(id),
  city_id INTEGER REFERENCES cities(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reinvestment_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  payment_id INTEGER UNIQUE REFERENCES payments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes')
);
CREATE INDEX IF NOT EXISTS investment_payment_drafts_expiry_idx
  ON investment_payment_drafts(expires_at) WHERE payment_id IS NULL;
