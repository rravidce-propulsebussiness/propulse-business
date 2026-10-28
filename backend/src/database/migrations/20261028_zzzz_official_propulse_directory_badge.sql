-- Official ProPulse identifies the platform's existing professional account.
-- It is separate from company document verification; no badge can be self-assigned.
ALTER TABLE business_expert_directory_settings
  ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_expert_directory_one_official_propulse
  ON business_expert_directory_settings(is_official) WHERE is_official=TRUE;

-- Seed only if exactly one previously-featured, active registered business
-- has the established ProPulse-owned company name. Do not rely on generated IDs.
WITH candidate AS (
  SELECT u.id
  FROM users u
  JOIN business_profiles bp ON bp.user_id=u.id
  JOIN business_expert_directory_settings d ON d.user_id=u.id
  WHERE u.role='business' AND u.is_active=TRUE AND d.is_featured=TRUE
    AND LOWER(TRIM(bp.business_name))='propulse constructions and interiors'
)
INSERT INTO business_expert_directory_settings(user_id,is_official,is_featured)
SELECT id,TRUE,TRUE FROM candidate WHERE (SELECT COUNT(*) FROM candidate)=1
ON CONFLICT(user_id) DO UPDATE SET is_official=TRUE,is_featured=TRUE;
