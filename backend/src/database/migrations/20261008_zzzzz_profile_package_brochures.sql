-- Separate package/specification documents from project plan/drawing uploads.
-- Every reference remains owned by the publishing business and is signed on read.
BEGIN;
ALTER TABLE business_profile_projects
  ADD COLUMN IF NOT EXISTS brochure_url TEXT;
ALTER TABLE business_profile_service_plans
  ADD COLUMN IF NOT EXISTS brochure_url TEXT;
COMMIT;
