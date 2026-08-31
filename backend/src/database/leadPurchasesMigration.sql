-- Lead marketplace purchases: one purchase grants a number of access shares to a buyer.
CREATE TABLE IF NOT EXISTS lead_purchases (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shares INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  pricing_tier VARCHAR(20) NOT NULL DEFAULT 'normal',
  status VARCHAR(20) NOT NULL DEFAULT 'paid',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT lead_purchases_shares_check CHECK (shares IN (1,3,5)),
  CONSTRAINT lead_purchases_amount_check CHECK (amount >= 0),
  CONSTRAINT lead_purchases_tier_check CHECK (pricing_tier IN ('normal','pro')),
  CONSTRAINT lead_purchases_status_check CHECK (status IN ('paid','refunded','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_lead ON lead_purchases(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_user ON lead_purchases(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_purchases_active_user ON lead_purchases(lead_id,user_id) WHERE status='paid';
