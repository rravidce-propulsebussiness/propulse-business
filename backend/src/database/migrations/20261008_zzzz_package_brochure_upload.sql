-- Each service package can publish a brochure stored in the existing secure
-- business-project document bucket; no duplicate upload subsystem is needed.
ALTER TABLE business_profile_service_plans
  ADD COLUMN IF NOT EXISTS brochure_url TEXT;
