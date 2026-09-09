-- Enforce the real invariant used by the lead payment flow:
-- one payment may create at most one wallet debit.
-- The older 2026-09-01 integrity migration used reference_type='lead_purchase'
-- and can sort before the wallet table migration, so this migration is the
-- authoritative constraint and is intentionally named after the wallet schema.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_payment_debit
  ON wallet_transactions(payment_id)
  WHERE type = 'debit' AND payment_id IS NOT NULL;
