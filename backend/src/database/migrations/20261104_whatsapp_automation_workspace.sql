ALTER TABLE messaging_api_clients
  ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS messaging_api_clients_owner_created_idx
  ON messaging_api_clients(owner_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_automation_rules (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  trigger_event VARCHAR(80) NOT NULL,
  message_template VARCHAR(4096) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  environment VARCHAR(12) NOT NULL DEFAULT 'test' CHECK (environment='test'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS whatsapp_automation_rules_owner_event_idx
  ON whatsapp_automation_rules(owner_user_id, trigger_event, is_enabled);

CREATE TABLE IF NOT EXISTS whatsapp_automation_runs (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_id BIGINT REFERENCES whatsapp_automation_rules(id) ON DELETE SET NULL,
  api_client_id BIGINT REFERENCES messaging_api_clients(id) ON DELETE SET NULL,
  event_name VARCHAR(80) NOT NULL,
  recipient_masked VARCHAR(24) NOT NULL,
  message_length INTEGER NOT NULL CHECK (message_length BETWEEN 0 AND 4096),
  status VARCHAR(20) NOT NULL DEFAULT 'simulated' CHECK (status='simulated'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS whatsapp_automation_runs_owner_created_idx
  ON whatsapp_automation_runs(owner_user_id, created_at DESC);
