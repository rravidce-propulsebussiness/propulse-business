-- Published package pricing is an owner-configured starting rate, not a
-- completed project's historic budget or a binding customer quote.
BEGIN;
ALTER TABLE business_profile_service_plans
  ADD COLUMN IF NOT EXISTS price_unit VARCHAR(24) NOT NULL DEFAULT 'unspecified';
ALTER TABLE professional_project_quote_requests
  ADD COLUMN IF NOT EXISTS package_price_from_snapshot NUMERIC(12,2);
ALTER TABLE professional_project_quote_requests
  ADD COLUMN IF NOT EXISTS package_price_unit_snapshot VARCHAR(24);
COMMIT;
