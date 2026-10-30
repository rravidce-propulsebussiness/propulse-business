-- The uploaded original remains private. Only a separately redacted,
-- manually privacy-reviewed derivative may be exposed by public APIs.
ALTER TABLE business_profile_projects
 ADD COLUMN IF NOT EXISTS video_redaction_status TEXT NOT NULL DEFAULT 'pending',
 ADD COLUMN IF NOT EXISTS video_redaction_source_url TEXT,
 ADD COLUMN IF NOT EXISTS video_redacted_url TEXT,
 ADD COLUMN IF NOT EXISTS video_redaction_error TEXT,
 ADD COLUMN IF NOT EXISTS video_redaction_started_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS video_redaction_finished_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS video_redaction_token UUID;

ALTER TABLE business_profile_projects
 DROP CONSTRAINT IF EXISTS business_profile_projects_video_redaction_status_check;
ALTER TABLE business_profile_projects
 ADD CONSTRAINT business_profile_projects_video_redaction_status_check
 CHECK (video_redaction_status IN ('pending','processing','ready','failed'));

-- Workers claim through SELECT FOR UPDATE SKIP LOCKED.
CREATE INDEX IF NOT EXISTS idx_project_video_redaction_queue
 ON business_profile_projects(video_redaction_status,video_redaction_started_at,id)
 WHERE video_url IS NOT NULL AND video_url<>'' AND is_published=TRUE;

-- Approved originals are NOT grandfathered in. A processed derivative and
-- a fresh manual review are required before public exposure.
UPDATE business_profile_projects
 SET video_privacy_cleared_url=NULL,
     video_reward_status='pending',
     video_reward_fingerprint=NULL,
     video_reward_approved_url=NULL,
     video_reward_reviewed_by=NULL,
     video_reward_reviewed_at=NULL
 WHERE video_url IS NOT NULL
   AND (video_redacted_url IS NULL OR video_redaction_source_url IS DISTINCT FROM video_url);
