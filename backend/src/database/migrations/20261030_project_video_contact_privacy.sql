-- Privacy review is distinct from reward approval. No old video is
-- assumed contact-safe: pre-existing approved videos remain private until
-- explicitly re-reviewed by an admin. Unchanged projects/photos remain public.
ALTER TABLE business_profile_projects
  ADD COLUMN IF NOT EXISTS video_privacy_cleared_url TEXT;

COMMENT ON COLUMN business_profile_projects.video_privacy_cleared_url IS
  'Exact uploaded video reference explicitly reviewed by an admin as free of direct contact details in video and audio.';

CREATE INDEX IF NOT EXISTS idx_project_video_privacy_public
  ON business_profile_projects(video_published_at DESC,id DESC)
  WHERE is_published=TRUE
    AND video_reward_status='approved'
    AND video_privacy_cleared_url IS NOT NULL;
