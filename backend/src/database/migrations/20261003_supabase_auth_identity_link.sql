-- Link existing numeric Propulse users to Supabase Auth UUID identities.
-- This migration is intentionally additive so the current cookie/JWT auth remains valid
-- while accounts are migrated in place.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_supabase_user_id
  ON users (supabase_user_id)
  WHERE supabase_user_id IS NOT NULL;

COMMENT ON COLUMN users.supabase_user_id IS
  'Supabase Auth auth.users.id linked to this existing Propulse application user.';
