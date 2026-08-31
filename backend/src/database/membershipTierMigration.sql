-- Add explicit Pro / Non-Pro classification to membership plans.
ALTER TABLE membership_plans
  ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) NOT NULL DEFAULT 'non_pro';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'membership_plans_plan_type_check'
  ) THEN
    ALTER TABLE membership_plans
      ADD CONSTRAINT membership_plans_plan_type_check
      CHECK (plan_type IN ('pro', 'non_pro'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_membership_plans_type_active
  ON membership_plans(plan_type, is_active);

-- Existing plans remain Non-Pro until an admin explicitly changes them.
