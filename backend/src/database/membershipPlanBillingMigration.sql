-- Configurable membership billing periods and discounts.
ALTER TABLE membership_plans
  ADD COLUMN IF NOT EXISTS billing_period VARCHAR(40) NOT NULL DEFAULT 'yearly',
  ADD COLUMN IF NOT EXISTS monthly_base_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='membership_plans_discount_check') THEN
    ALTER TABLE membership_plans ADD CONSTRAINT membership_plans_discount_check
      CHECK (discount_percent >= 0 AND discount_percent <= 100);
  END IF;
END $$;

UPDATE membership_plans
SET monthly_base_price = CASE WHEN duration_days >= 365 THEN ROUND(price / 12, 2) ELSE price END
WHERE monthly_base_price IS NULL;

CREATE INDEX IF NOT EXISTS idx_membership_plans_period_active
  ON membership_plans(plan_type, billing_period, is_active);
