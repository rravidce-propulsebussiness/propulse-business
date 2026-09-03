-- Financial integrity: a lead purchase can create at most one wallet debit.
-- The wallet ledger table is created by the sibling 2026-09-01-wallet.sql migration.
-- Keep this historical migration safe when filenames sort before that table migration.
DO $$
BEGIN
  IF to_regclass('public.wallet_transactions') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_lead_purchase_debit
      ON wallet_transactions(reference_type, reference_id)
      WHERE type = 'debit' AND reference_type = 'lead_purchase' AND reference_id IS NOT NULL;
  END IF;
END $$;
