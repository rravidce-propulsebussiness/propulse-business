-- Multi-tenant WhatsApp Cloud API accounts and outbound message audit.
-- Access tokens are encrypted by the application before storage.
CREATE TABLE IF NOT EXISTS whatsapp_business_accounts (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_account_id VARCHAR(64) NOT NULL,
  phone_number_id VARCHAR(64) NOT NULL,
  display_phone_number VARCHAR(32),
  verified_name VARCHAR(160),
  access_token_encrypted TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_user_id, phone_number_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_business_accounts_owner_status_idx
  ON whatsapp_business_accounts(owner_user_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_cloud_messages (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES whatsapp_business_accounts(id) ON DELETE RESTRICT,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_phone VARCHAR(20) NOT NULL,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'template')),
  payload JSONB NOT NULL,
  meta_message_id VARCHAR(160),
  status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'failed')),
  error_message VARCHAR(500),
  idempotency_key VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_cloud_messages_idempotency_idx
  ON whatsapp_cloud_messages(owner_user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_cloud_messages_owner_created_idx
  ON whatsapp_cloud_messages(owner_user_id, created_at DESC);
