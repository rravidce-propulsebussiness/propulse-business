BEGIN;

-- Canonical purchase-payment metadata. One payment row represents one commercial purchase,
-- while wallet_transactions remains the source of truth for wallet balance movements.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(30);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS purchase_id BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS wallet_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (wallet_amount >= 0);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (external_amount >= 0);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS wallet_transaction_id INTEGER;

-- Existing payments were direct/manual payments, so preserve their full amount as external payment.
UPDATE payments SET wallet_amount=0,external_amount=amount WHERE COALESCE(wallet_amount,0)=0 AND COALESCE(external_amount,0)=0;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check CHECK (payment_method IN ('gateway','manual','wallet','wallet_manual'));
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_purchase_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_purchase_type_check CHECK (purchase_type IS NULL OR purchase_type IN ('membership','lead','booster'));
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_split_amount_check;
ALTER TABLE payments ADD CONSTRAINT payments_split_amount_check CHECK (ROUND(wallet_amount + external_amount,2)=ROUND(amount,2));
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_wallet_transaction_fk;
ALTER TABLE payments ADD CONSTRAINT payments_wallet_transaction_fk FOREIGN KEY (wallet_transaction_id) REFERENCES wallet_transactions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_purchase ON payments(purchase_type,purchase_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_purchase ON payments(user_id,purchase_type,purchase_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_pending_purchase ON payments(user_id,purchase_type,purchase_id) WHERE purchase_type IS NOT NULL AND purchase_id IS NOT NULL AND status IN ('pending','processing');

ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS payment_id INTEGER;
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_payment_fk;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_payment_fk FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_payment ON wallet_transactions(payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_payment_transaction_type ON wallet_transactions(payment_id,type) WHERE payment_id IS NOT NULL;

ALTER TABLE lead_purchases ADD COLUMN IF NOT EXISTS payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE lead_purchases DROP CONSTRAINT IF EXISTS lead_purchases_status_check;
ALTER TABLE lead_purchases ADD CONSTRAINT lead_purchases_status_check CHECK (status IN ('pending_payment','paid','refunded','cancelled'));
CREATE INDEX IF NOT EXISTS idx_lead_purchases_payment ON lead_purchases(payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_purchases_pending_user ON lead_purchases(lead_id,user_id) WHERE status='pending_payment';

ALTER TABLE booster_orders ADD COLUMN IF NOT EXISTS payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE booster_orders ADD COLUMN IF NOT EXISTS wallet_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (wallet_amount >= 0);
ALTER TABLE booster_orders ADD COLUMN IF NOT EXISTS external_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (external_amount >= 0);
CREATE INDEX IF NOT EXISTS idx_booster_orders_payment ON booster_orders(payment_id);

COMMIT;
