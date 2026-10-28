-- Rewards require an uploaded project video to be manually approved by an admin.
-- Existing lead grants are not revoked or altered by this migration.
ALTER TABLE business_profile_projects
 ADD COLUMN IF NOT EXISTS video_reward_status TEXT NOT NULL DEFAULT 'pending',
 ADD COLUMN IF NOT EXISTS video_reward_fingerprint CHAR(64),
 ADD COLUMN IF NOT EXISTS video_reward_approved_url TEXT,
 ADD COLUMN IF NOT EXISTS video_reward_reviewed_by INTEGER,
 ADD COLUMN IF NOT EXISTS video_reward_reviewed_at TIMESTAMP,
 ADD COLUMN IF NOT EXISTS video_reward_review_note TEXT;
ALTER TABLE business_profile_projects
 DROP CONSTRAINT IF EXISTS business_profile_projects_video_reward_status_check;
ALTER TABLE business_profile_projects
 ADD CONSTRAINT business_profile_projects_video_reward_status_check
 CHECK (video_reward_status IN ('pending','approved','rejected'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_approved_project_video_fingerprint
 ON business_profile_projects(video_reward_fingerprint)
 WHERE video_reward_status='approved' AND video_reward_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_video_reward_pending
 ON business_profile_projects(video_reward_status,updated_at DESC)
 WHERE is_published=TRUE AND completion_year IS NOT NULL AND video_url IS NOT NULL;
