BEGIN;

ALTER TABLE business_profile_projects
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

UPDATE business_profile_projects
SET published_at=COALESCE(published_at,video_published_at,created_at)
WHERE published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_business_profile_projects_recent
  ON business_profile_projects(published_at DESC,id DESC)
  WHERE is_published=TRUE;

COMMIT;
