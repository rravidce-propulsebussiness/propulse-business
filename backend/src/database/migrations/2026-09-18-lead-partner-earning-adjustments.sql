CREATE TABLE IF NOT EXISTS lead_partner_earning_adjustments (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES lead_partners(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  earning_id INTEGER REFERENCES lead_partner_earnings(id) ON DELETE RESTRICT,
  lead_purchase_id INTEGER REFERENCES lead_purchases(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  type VARCHAR(30) NOT NULL CHECK (type IN ('fake_lead_recovery')),
  status VARCHAR(20) NOT NULL DEFAULT 'outstanding' CHECK (status IN ('outstanding','recovered','cancelled')),
  reason TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recovered_at TIMESTAMP,
  UNIQUE (type, lead_purchase_id)
);
CREATE INDEX IF NOT EXISTS idx_lp_earning_adjustments_partner_status ON lead_partner_earning_adjustments(partner_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lp_earning_adjustments_earning ON lead_partner_earning_adjustments(earning_id);
