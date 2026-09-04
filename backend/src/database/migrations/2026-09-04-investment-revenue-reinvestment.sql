BEGIN;

ALTER TABLE investor_settings
  ADD COLUMN IF NOT EXISTS investment_cycle_days INTEGER NOT NULL DEFAULT 30 CHECK (investment_cycle_days > 0),
  ADD COLUMN IF NOT EXISTS auto_reinvest BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS investor_revenue_share_percent NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (investor_revenue_share_percent >= 0 AND investor_revenue_share_percent <= 100);

ALTER TABLE investment_industry_rules
  ADD COLUMN IF NOT EXISTS investor_revenue_share_percent NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (investor_revenue_share_percent >= 0 AND investor_revenue_share_percent <= 100);

ALTER TABLE investments
  ADD COLUMN IF NOT EXISTS realized_revenue NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (realized_revenue >= 0),
  ADD COLUMN IF NOT EXISTS payout_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (payout_amount >= 0),
  ADD COLUMN IF NOT EXISTS reinvestment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS parent_investment_id INTEGER REFERENCES investments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_investment_reinvestment_parent
  ON investments(parent_investment_id) WHERE parent_investment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS investment_revenue_allocations (
  id SERIAL PRIMARY KEY,
  investment_id INTEGER NOT NULL REFERENCES investments(id) ON DELETE RESTRICT,
  lead_purchase_id INTEGER NOT NULL UNIQUE REFERENCES lead_purchases(id) ON DELETE RESTRICT,
  industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE RESTRICT,
  gross_sale_amount NUMERIC(14,2) NOT NULL CHECK (gross_sale_amount >= 0),
  investor_share_percent NUMERIC(5,2) NOT NULL CHECK (investor_share_percent >= 0 AND investor_share_percent <= 100),
  allocated_amount NUMERIC(14,4) NOT NULL CHECK (allocated_amount >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_investment_revenue_allocations_investment ON investment_revenue_allocations(investment_id);
CREATE INDEX IF NOT EXISTS idx_investment_revenue_allocations_industry ON investment_revenue_allocations(industry_id);

-- Retain the old field for backward compatibility, but do not use it to promise
-- a return. New settlement uses realized paid lead-sale revenue.
UPDATE investment_industry_rules SET return_percent = 0 WHERE return_percent <> 0;

COMMIT;
