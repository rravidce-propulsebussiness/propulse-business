BEGIN;
ALTER TABLE business_profile_projects ADD COLUMN IF NOT EXISTS package_name VARCHAR(160);
COMMIT;
