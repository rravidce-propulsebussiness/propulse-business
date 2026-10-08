BEGIN;
ALTER TABLE business_profile_projects
  ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE business_profile_projects
  DROP CONSTRAINT IF EXISTS business_profile_projects_image_urls_check;
ALTER TABLE business_profile_projects
  ADD CONSTRAINT business_profile_projects_image_urls_check
  CHECK (jsonb_typeof(image_urls)='array' AND jsonb_array_length(image_urls)<=8);
COMMIT;
