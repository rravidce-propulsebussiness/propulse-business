-- Add a dedicated proof-of-email flow for existing ProPulse users.
-- Does not mark any historical user as verified or change passwords.
CREATE TABLE IF NOT EXISTS propulse_email_verification_tokens (
  token_hash CHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  auth_version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_propulse_email_verification_tokens_user
  ON propulse_email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_propulse_email_verification_tokens_expiry
  ON propulse_email_verification_tokens(expires_at);
