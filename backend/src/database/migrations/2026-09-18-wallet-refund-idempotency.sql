-- A payment may only receive one wallet refund.
-- This makes fake-lead refund handling idempotent even if a second code path
-- attempts to refund the same payment.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_transactions_refund_payment
  ON wallet_transactions(payment_id)
  WHERE type='refund' AND payment_id IS NOT NULL;
