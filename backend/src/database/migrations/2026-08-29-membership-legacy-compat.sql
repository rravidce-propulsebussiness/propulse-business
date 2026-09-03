-- Compatibility bridge for deployments whose base memberships table predates expires_at.
-- The completeness migration can then safely copy legacy end dates when that column exists.
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP;
