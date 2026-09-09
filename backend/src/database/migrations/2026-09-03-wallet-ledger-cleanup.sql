-- Remove the superseded lead-reference uniqueness rule.
-- Wallet debits are now uniquely tied to their payment_id by
-- 2026-09-02-wallet-ledger-integrity.sql, which matches the runtime ledger flow.
DROP INDEX IF EXISTS uq_wallet_lead_purchase_debit;
