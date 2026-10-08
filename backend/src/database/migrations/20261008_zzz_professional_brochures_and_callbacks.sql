BEGIN;

-- Profile enquiries have no individual project, but use the existing, private
-- callback workflow and audit trail instead of creating a second lead system.
ALTER TABLE project_callback_requests ALTER COLUMN project_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_callbacks_business_profile_requests
  ON project_callback_requests(business_user_id,customer_phone,created_at DESC)
  WHERE project_id IS NULL;

-- Brochures are business-managed public documents. The bytes remain in private
-- R2 storage and are served using short-lived signed display URLs.
CREATE TABLE IF NOT EXISTS business_profile_brochures (
  id BIGSERIAL PRIMARY KEY,
  business_profile_id INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  description VARCHAR(500),
  file_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_public_brochures_business
  ON business_profile_brochures(business_profile_id,is_published,sort_order,id);
COMMIT;
