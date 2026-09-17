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
