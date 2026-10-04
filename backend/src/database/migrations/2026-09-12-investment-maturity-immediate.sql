BEGIN;

-- Allow 0-day maturity for the admin "Immediate" test mode.
-- The normal production range remains enforced at the application layer (0-3650 days).
ALTER TABLE investor_settings
  DROP CONSTRAINT IF EXISTS investor_settings_investment_cycle_days_check;
ALTER TABLE investor_settings
  ADD CONSTRAINT investor_settings_investment_cycle_days_check
  CHECK (investment_cycle_days >= 0 AND investment_cycle_days <= 3650);

ALTER TABLE investment_industry_rules
  DROP CONSTRAINT IF EXISTS investment_industry_rules_maturity_days_check;
ALTER TABLE investment_industry_rules
  ADD CONSTRAINT investment_industry_rules_maturity_days_check
  CHECK (maturity_days >= 0);

ALTER TABLE investments
  DROP CONSTRAINT IF EXISTS investments_maturity_days_check;
ALTER TABLE investments
  ADD CONSTRAINT investments_maturity_days_check
  CHECK (maturity_days >= 0);

COMMIT;
