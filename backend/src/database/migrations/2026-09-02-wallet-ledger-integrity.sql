-- Enforce the real invariant used by the lead payment flow:
-- one payment may create at most one wallet debit.
-- The original wallet ledger migration did not include payment_id, while the
-- runtime ledger links debits to payments. Add that column idempotently before
-- enforcing the uniqueness invariant so both fresh and existing databases heal.
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS payment_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_wallet_transactions_payment'
      AND conrelid = 'wallet_transactions'::regclass
  ) THEN
    ALTER TABLE wallet_transactions
      ADD CONSTRAINT fk_wallet_transactions_payment
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_payment
  ON wallet_transactions(payment_id)
  WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_payment_debit
  ON wallet_transactions(payment_id)
  WHERE type = 'debit' AND payment_id IS NOT NULL;
