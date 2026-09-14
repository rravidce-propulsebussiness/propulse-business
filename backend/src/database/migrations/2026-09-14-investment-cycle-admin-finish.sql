ALTER TABLE investment_cycles
  ADD COLUMN IF NOT EXISTS admin_closed_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS admin_closed_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_investment_cycles_status_updated
  ON investment_cycles(status, updated_at DESC);
