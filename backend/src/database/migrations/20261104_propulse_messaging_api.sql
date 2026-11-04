CREATE TABLE IF NOT EXISTS messaging_api_clients (
  id BIGSERIAL PRIMARY KEY,
  company_name VARCHAR(160) NOT NULL,
  contact_email VARCHAR(254),
  environment VARCHAR(12) NOT NULL DEFAULT 'test' CHECK (environment IN ('test')),
  api_key_hash CHAR(64) NOT NULL UNIQUE,
  api_key_prefix VARCHAR(40) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60 CHECK (rate_limit_per_minute BETWEEN 1 AND 600),
  created_by INTEGER,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS messaging_api_clients_status_created_idx
  ON messaging_api_clients(status, created_at DESC);

CREATE TABLE IF NOT EXISTS messaging_api_messages (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES messaging_api_clients(id) ON DELETE RESTRICT,
  environment VARCHAR(12) NOT NULL DEFAULT 'test' CHECK (environment = 'test'),
  recipient_masked VARCHAR(24) NOT NULL,
  message_length INTEGER NOT NULL CHECK (message_length BETWEEN 1 AND 4096),
  status VARCHAR(20) NOT NULL DEFAULT 'simulated' CHECK (status = 'simulated'),
  idempotency_key VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS messaging_api_messages_idempotency_idx
  ON messaging_api_messages(client_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS messaging_api_messages_created_idx
  ON messaging_api_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS messaging_api_messages_client_created_idx
  ON messaging_api_messages(client_id, created_at DESC);
