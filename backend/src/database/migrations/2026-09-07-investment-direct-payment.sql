BEGIN;

ALTER TABLE investments
  ADD COLUMN IF NOT EXISTS payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL;

ALTER TABLE investments DROP CONSTRAINT IF EXISTS investments_status_check;
ALTER TABLE investments ADD CONSTRAINT investments_status_check
  CHECK (status IN ('pending','active','matured','paid','cancelled'));

CREATE INDEX IF NOT EXISTS idx_investments_payment_id ON investments(payment_id);
CREATE INDEX IF NOT EXISTS idx_investments_pending_payment ON investments(user_id,status) WHERE status='pending';

COMMIT;
