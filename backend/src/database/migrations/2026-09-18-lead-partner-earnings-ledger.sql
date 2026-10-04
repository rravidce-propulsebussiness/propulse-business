CREATE TABLE IF NOT EXISTS lead_partner_earnings (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES lead_partners(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  lead_purchase_id INTEGER NOT NULL REFERENCES lead_purchases(id) ON DELETE RESTRICT,
  payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  gross_sale_amount NUMERIC(12,2) NOT NULL CHECK (gross_sale_amount >= 0),
  commission_percent NUMERIC(7,4) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
  earning_amount NUMERIC(12,2) NOT NULL CHECK (earning_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available','paid','reversed')),
  payout_id INTEGER,
  reversal_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (lead_purchase_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_partner_earnings_partner_status
  ON lead_partner_earnings(partner_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_partner_earnings_user_status
  ON lead_partner_earnings(user_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_partner_earnings_lead
  ON lead_partner_earnings(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_partner_earnings_payment
  ON lead_partner_earnings(payment_id);
