ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0;

UPDATE users
SET auth_version = 0
WHERE auth_version IS NULL;
