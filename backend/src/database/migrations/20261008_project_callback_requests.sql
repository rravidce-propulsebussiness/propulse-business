BEGIN;
CREATE TABLE IF NOT EXISTS project_callback_requests (
  id BIGSERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES business_profile_projects(id) ON DELETE CASCADE,
  business_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name VARCHAR(160) NOT NULL,
  customer_phone VARCHAR(16) NOT NULL,
  customer_email VARCHAR(255),
  message VARCHAR(1000),
  status VARCHAR(24) NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_project_callbacks_professional ON project_callback_requests(business_user_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_project_callbacks_dedupe ON project_callback_requests(project_id,customer_phone,created_at DESC);
COMMIT;
