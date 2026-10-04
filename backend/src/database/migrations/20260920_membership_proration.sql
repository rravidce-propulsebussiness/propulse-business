ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS membership_change_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS membership_previous_plan_id INTEGER REFERENCES membership_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS membership_credit NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (membership_credit >= 0),
  ADD COLUMN IF NOT EXISTS membership_target_starts_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS membership_target_expires_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_payments_membership_change
  ON payments(membership_change_type)
  WHERE membership_change_type IS NOT NULL;