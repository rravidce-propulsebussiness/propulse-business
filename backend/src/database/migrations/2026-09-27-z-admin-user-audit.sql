BEGIN;

CREATE TABLE IF NOT EXISTS admin_user_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(60) NOT NULL,
  before_data JSONB,
  after_data JSONB,
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_user_audit_user
  ON admin_user_audit(user_id,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_user_audit_admin
  ON admin_user_audit(admin_id,created_at DESC);

COMMIT;
