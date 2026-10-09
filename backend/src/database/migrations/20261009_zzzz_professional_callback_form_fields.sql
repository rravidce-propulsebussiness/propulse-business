-- Preserve structured professional callback answers independently of optional free text.
ALTER TABLE project_callback_requests
 ADD COLUMN IF NOT EXISTS requirement_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
