-- Re-apply the lead-purchase wallet debit invariant after the wallet tables exist.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_lead_purchase_debit
ON wallet_transactions(reference_type, reference_id)
WHERE type = 'debit' AND reference_type = 'lead_purchase' AND reference_id IS NOT NULL;
