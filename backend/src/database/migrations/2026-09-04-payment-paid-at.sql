-- Keep payment review writes compatible with the payment service.
-- Existing databases may have been created before paid_at was introduced.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at DESC);
