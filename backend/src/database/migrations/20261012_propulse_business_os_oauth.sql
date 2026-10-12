-- OAuth 2.0 authorization-code bridge for ProPulse -> Business OS.
-- No existing passwords, application sessions or memberships are changed.
-- Email must be independently verified before exposing an identity to OAuth.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS propulse_oauth_authorization_codes (
  code_hash CHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge CHAR(43) NOT NULL,
  auth_version INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_propulse_oauth_codes_expiry
  ON propulse_oauth_authorization_codes(expires_at);

CREATE TABLE IF NOT EXISTS propulse_oauth_access_tokens (
  token_hash CHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  auth_version INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_propulse_oauth_tokens_expiry
  ON propulse_oauth_access_tokens(expires_at);

COMMENT ON COLUMN users.email_verified_at IS
  'Verified by Google ID token or an independently delivered email recovery link. Do not infer from a password sign-in.';
