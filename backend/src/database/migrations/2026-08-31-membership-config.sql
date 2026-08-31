-- Configurable membership periods, live pricing, lead entitlements and add-ons.
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS plan_group VARCHAR(120);
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS plan_type VARCHAR(30) NOT NULL DEFAULT 'non_pro';
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS billing_period VARCHAR(40) NOT NULL DEFAULT 'yearly';
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS billing_months INTEGER NOT NULL DEFAULT 1 CHECK (billing_months > 0);
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS monthly_base_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monthly_base_price >= 0);
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100);
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS benefits JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS lead_entitlements JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS add_ons JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE membership_plans DROP CONSTRAINT IF EXISTS membership_plans_billing_period_check;
UPDATE membership_plans SET plan_group=COALESCE(plan_group,name),monthly_base_price=CASE WHEN monthly_base_price=0 THEN price ELSE monthly_base_price END WHERE plan_group IS NULL OR monthly_base_price=0;
CREATE INDEX IF NOT EXISTS idx_membership_plans_group ON membership_plans(plan_group);
CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON membership_plans(is_active);
