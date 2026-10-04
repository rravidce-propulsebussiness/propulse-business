BEGIN;

ALTER TABLE business_profile_projects
  ADD COLUMN IF NOT EXISTS video_published_at TIMESTAMP;

UPDATE business_profile_projects
SET video_published_at=COALESCE(video_published_at,created_at)
WHERE COALESCE(video_url,'')<>''
  AND video_published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_business_profile_projects_recent_video
  ON business_profile_projects(video_published_at DESC,id DESC)
  WHERE is_published=TRUE AND COALESCE(video_url,'')<>'';

COMMIT;
