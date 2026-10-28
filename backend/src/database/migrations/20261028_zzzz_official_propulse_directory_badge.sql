-- Official ownership is independent of company proof verification and paid membership.
-- Restrict the marker to the ProPulse-owned account; never infer ownership by display name alone.
ALTER TABLE business_expert_directory_settings
  ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_expert_directory_one_official_propulse
  ON business_expert_directory_settings(is_official) WHERE is_official=TRUE;
INSERT INTO business_expert_directory_settings(user_id,is_official,is_featured)
SELECT u.id,TRUE,TRUE
FROM users u JOIN business_profiles bp ON bp.user_id=u.id
WHERE u.id=31 AND u.role='business'
  AND LOWER(TRIM(bp.business_name))='propulse constructions and interiors'
ON CONFLICT(user_id) DO UPDATE SET is_official=TRUE,is_featured=TRUE;
