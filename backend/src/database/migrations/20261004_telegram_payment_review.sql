BEGIN;

CREATE TABLE IF NOT EXISTS telegram_payment_review_map (
  entity_type VARCHAR(20) NOT NULL,
  entity_id BIGINT NOT NULL,
  telegram_chat_id VARCHAR(64) NOT NULL,
  telegram_message_id BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(entity_type,entity_id),
  UNIQUE(telegram_chat_id,telegram_message_id),
  CHECK (entity_type IN ('payment','wallet_topup')),
  CHECK (status IN ('pending','approved','rejected'))
);

CREATE INDEX IF NOT EXISTS idx_telegram_payment_review_status
  ON telegram_payment_review_map(status,updated_at DESC);

COMMIT;
