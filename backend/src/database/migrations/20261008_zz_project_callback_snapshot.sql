BEGIN;
-- Accommodate deployments that ran the initial callback schema before project
-- snapshots were introduced. Professional enquiries must survive profile edits.
ALTER TABLE IF EXISTS project_callback_requests
  DROP CONSTRAINT IF EXISTS project_callback_requests_project_id_fkey;
ALTER TABLE IF EXISTS project_callback_requests
  ADD COLUMN IF NOT EXISTS project_title VARCHAR(180);
UPDATE project_callback_requests r
  SET project_title=COALESCE(
    (SELECT p.title FROM business_profile_projects p WHERE p.id=r.project_id),
    'Project'
  )
  WHERE r.project_title IS NULL;
ALTER TABLE IF EXISTS project_callback_requests
  ALTER COLUMN project_title SET NOT NULL;
COMMIT;
