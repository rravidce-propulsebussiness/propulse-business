-- Professional-owned, editable SEO metadata for public completed projects.
-- Slugs are unique sitewide. Existing ID-based project URLs remain valid.
ALTER TABLE business_profile_projects
  ADD COLUMN IF NOT EXISTS seo_slug VARCHAR(100),
  ADD COLUMN IF NOT EXISTS seo_title VARCHAR(160),
  ADD COLUMN IF NOT EXISTS seo_description VARCHAR(320),
  ADD COLUMN IF NOT EXISTS seo_keyword VARCHAR(160);

CREATE UNIQUE INDEX IF NOT EXISTS uq_business_profile_projects_seo_slug
  ON business_profile_projects (seo_slug)
  WHERE seo_slug IS NOT NULL;

ALTER TABLE business_profile_projects
  DROP CONSTRAINT IF EXISTS business_profile_projects_seo_slug_format_check;
ALTER TABLE business_profile_projects
  ADD CONSTRAINT business_profile_projects_seo_slug_format_check
  CHECK (seo_slug IS NULL OR seo_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
