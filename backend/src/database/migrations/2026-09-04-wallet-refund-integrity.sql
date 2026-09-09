-- Enforce the refund invariant used by the wallet refund flow:
-- a payment may create at most one wallet refund transaction.
-- The runtime already checks this before inserting; this index makes the
-- invariant database-enforced as well and remains safe for non-wallet payments.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_payment_refund
  ON wallet_transactions(payment_id)
  WHERE type = 'refund' AND payment_id IS NOT NULL;
