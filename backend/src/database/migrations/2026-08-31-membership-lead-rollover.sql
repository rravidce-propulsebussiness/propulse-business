-- Membership lead allocation rules.
-- Leads are allowances, not expiring coupons: unused monthly allowance rolls forward.
-- period_total is the maximum allowance granted across the full paid billing period.

ALTER TABLE membership_plans
  ADD COLUMN IF NOT EXISTS lead_rollover_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE membership_plans
  ADD COLUMN IF NOT EXISTS lead_expiry_days INTEGER;

ALTER TABLE membership_plans
  DROP CONSTRAINT IF EXISTS membership_plans_lead_expiry_check;

ALTER TABLE membership_plans
  ADD CONSTRAINT membership_plans_lead_expiry_check
  CHECK (lead_expiry_days IS NULL OR lead_expiry_days > 0);

CREATE INDEX IF NOT EXISTS idx_membership_plans_lead_rollover
  ON membership_plans(lead_rollover_enabled, is_active);
