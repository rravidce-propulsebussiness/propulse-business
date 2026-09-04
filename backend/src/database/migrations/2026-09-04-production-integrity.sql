-- Production integrity fixes.
-- Keep this migration idempotent because the migration runner records applied filenames.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- Useful indexes for high-volume authenticated/admin reads.
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_created_at_idx ON leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payments (created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_created_at_idx ON payments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS users_active_role_idx ON users (is_active, role);
