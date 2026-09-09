BEGIN;

-- Every payment may capture its wallet-funded portion at most once.
-- The existing lead-purchase index predates the current reference_type='lead'
-- convention, so enforce the invariant directly on payment_id instead.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_payment_debit
  ON wallet_transactions(payment_id)
  WHERE type = 'debit' AND payment_id IS NOT NULL;

COMMIT;
