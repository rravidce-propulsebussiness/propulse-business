ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS plan_group VARCHAR(120);
CREATE INDEX IF NOT EXISTS idx_membership_plans_group ON membership_plans(plan_group);
