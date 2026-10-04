BEGIN;

CREATE TABLE IF NOT EXISTS support_chat_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id=1),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  allow_guests BOOLEAN NOT NULL DEFAULT TRUE,
  widget_title VARCHAR(80) NOT NULL DEFAULT 'Chat with us',
  greeting VARCHAR(500) NOT NULL DEFAULT 'Hi! How can we help you today?',
  offline_message VARCHAR(500) NOT NULL DEFAULT 'Leave us a message and our support team will get back to you.',
  poll_seconds INTEGER NOT NULL DEFAULT 4,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (poll_seconds BETWEEN 3 AND 30)
);

INSERT INTO support_chat_settings(id)
VALUES(1)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS support_conversations (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(40) NOT NULL UNIQUE,
  access_token_hash CHAR(64) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  guest_name VARCHAR(120),
  guest_email VARCHAR(254),
  guest_phone VARCHAR(32),
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  source_page VARCHAR(500),
  telegram_last_message_id BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  CHECK (status IN ('open','resolved'))
);

CREATE INDEX IF NOT EXISTS idx_support_conversations_user_status
  ON support_conversations(user_id,status,last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status_recent
  ON support_conversations(status,last_message_at DESC,id DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL,
  sender_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sender_name VARCHAR(160),
  source VARCHAR(20) NOT NULL,
  body TEXT NOT NULL,
  telegram_message_id BIGINT,
  telegram_delivery_status VARCHAR(24),
  telegram_delivery_error VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (sender_type IN ('customer','support','system')),
  CHECK (source IN ('website','telegram','admin','system')),
  CHECK (telegram_delivery_status IS NULL OR telegram_delivery_status IN ('pending','sent','failed','not_configured')),
  CHECK (char_length(body) BETWEEN 1 AND 4000)
);

CREATE INDEX IF NOT EXISTS idx_support_messages_conversation
  ON support_messages(conversation_id,id);

CREATE TABLE IF NOT EXISTS support_telegram_message_map (
  telegram_chat_id VARCHAR(64) NOT NULL,
  telegram_message_id BIGINT NOT NULL,
  conversation_id BIGINT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  support_message_id BIGINT REFERENCES support_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(telegram_chat_id,telegram_message_id)
);

CREATE INDEX IF NOT EXISTS idx_support_telegram_map_conversation
  ON support_telegram_message_map(conversation_id,created_at DESC);

COMMIT;
