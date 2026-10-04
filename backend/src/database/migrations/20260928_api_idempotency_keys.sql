CREATE TABLE IF NOT EXISTS api_idempotency_keys (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  scope VARCHAR(120) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed')),
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  CONSTRAINT uq_api_idempotency_key UNIQUE(user_id,scope,idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_keys_expires
  ON api_idempotency_keys(expires_at);
