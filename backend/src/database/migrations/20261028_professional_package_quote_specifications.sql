-- Structured, business-owned specifications for instant indicative package quotes.
BEGIN;
ALTER TABLE business_profile_service_plans
  ADD COLUMN IF NOT EXISTS spec_sections JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE professional_project_quote_requests
  ADD COLUMN IF NOT EXISTS package_spec_sections_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb;
COMMIT;
