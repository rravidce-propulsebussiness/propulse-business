-- This file sorts before the parent adjustment migration, so it must be
-- safe to execute on a fresh database. Create the parent ledger tables first;
-- later migrations use IF NOT EXISTS to harden/index them.

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

CREATE TABLE IF NOT EXISTS lead_partner_earning_adjustment_allocations (
  id SERIAL PRIMARY KEY,
  adjustment_id INTEGER NOT NULL REFERENCES lead_partner_earning_adjustments(id) ON DELETE RESTRICT,
  earning_id INTEGER NOT NULL REFERENCES lead_partner_earnings(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (adjustment_id, earning_id)
);

CREATE INDEX IF NOT EXISTS idx_lp_adjustment_allocations_adjustment
  ON lead_partner_earning_adjustment_allocations(adjustment_id);
CREATE INDEX IF NOT EXISTS idx_lp_adjustment_allocations_earning
  ON lead_partner_earning_adjustment_allocations(earning_id);
