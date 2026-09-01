-- Financial integrity: a lead purchase can create at most one wallet debit.
-- This protects the ledger if application retries ever reach the debit operation twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_lead_purchase_debit
ON wallet_transactions(reference_type, reference_id)
WHERE type = 'debit' AND reference_type = 'lead_purchase' AND reference_id IS NOT NULL;
