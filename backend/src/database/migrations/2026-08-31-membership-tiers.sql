-- Membership tiers: Pro, Investor and Booster.
-- Safe to run after the membership configuration migration.

ALTER TABLE membership_plans
  DROP CONSTRAINT IF EXISTS membership_plans_plan_type_check;

ALTER TABLE membership_plans
  ADD CONSTRAINT membership_plans_plan_type_check
  CHECK (plan_type IN ('pro', 'investor', 'booster', 'non_pro'));

CREATE INDEX IF NOT EXISTS idx_membership_plans_tier_period_active
  ON membership_plans(plan_type, billing_months, is_active);
