-- Per-enquiry Admin access mode. Preserve the current default for all old and new records.
ALTER TABLE professional_project_quote_requests
  ADD COLUMN IF NOT EXISTS access_mode VARCHAR(40) NOT NULL DEFAULT 'member_free_nonmember_paid';
ALTER TABLE project_callback_requests
  ADD COLUMN IF NOT EXISTS access_mode VARCHAR(40) NOT NULL DEFAULT 'member_free_nonmember_paid';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='professional_quote_access_mode_valid') THEN
    ALTER TABLE professional_project_quote_requests ADD CONSTRAINT professional_quote_access_mode_valid
      CHECK(access_mode IN ('free','paid','member_free_nonmember_paid','members_only'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='project_callback_access_mode_valid') THEN
    ALTER TABLE project_callback_requests ADD CONSTRAINT project_callback_access_mode_valid
      CHECK(access_mode IN ('free','paid','member_free_nonmember_paid','members_only'));
  END IF;
END $$;
