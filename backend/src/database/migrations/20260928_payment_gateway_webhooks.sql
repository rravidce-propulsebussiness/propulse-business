BEGIN;

CREATE TABLE IF NOT EXISTS payment_provider_events (
  id BIGSERIAL PRIMARY KEY,
  provider VARCHAR(40) NOT NULL,
  event_key VARCHAR(180) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  provider_order_id VARCHAR(180),
  provider_payment_id VARCHAR(180),
  local_payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','processed','ignored','failed')),
  error_code VARCHAR(80),
  error_message TEXT,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider,event_key)
);

CREATE INDEX IF NOT EXISTS idx_payment_provider_events_received
  ON payment_provider_events(provider,received_at DESC,id DESC);

CREATE INDEX IF NOT EXISTS idx_payment_provider_events_local_payment
  ON payment_provider_events(local_payment_id,received_at DESC)
  WHERE local_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_gateway_order
  ON payments(gateway,gateway_order_id)
  WHERE gateway IS NOT NULL AND NULLIF(BTRIM(gateway_order_id),'') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_gateway_payment
  ON payments(gateway,gateway_payment_id)
  WHERE gateway IS NOT NULL AND NULLIF(BTRIM(gateway_payment_id),'') IS NOT NULL;

COMMIT;
