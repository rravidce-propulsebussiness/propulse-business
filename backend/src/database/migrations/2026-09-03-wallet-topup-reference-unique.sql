-- Manual payment references must not be reusable across pending or approved top-ups.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_topups_manual_reference
ON wallet_topups (LOWER(TRIM(reference)))
WHERE reference IS NOT NULL AND TRIM(reference) <> '';
