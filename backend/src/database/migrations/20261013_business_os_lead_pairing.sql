-- Separate ProPulse-to-Business-OS lead-delivery grant. User must explicitly
-- authenticate to ProPulse and deliver a short-lived one-time pairing code.
-- This does not alter ProPulse OAuth or lead purchase entitlements.
CREATE TABLE IF NOT EXISTS business_os_pairing_codes (
  code_hash CHAR(64) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS business_os_pairing_codes_expiry
  ON business_os_pairing_codes(expires_at);

CREATE TABLE IF NOT EXISTS business_os_lead_grants (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS business_os_lead_grants_user
  ON business_os_lead_grants(user_id, expires_at);
