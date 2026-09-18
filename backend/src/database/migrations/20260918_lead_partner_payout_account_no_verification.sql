-- Lead Partner payout accounts are usable immediately after save.
-- Keep the legacy verification column for compatibility, but do not require Admin verification.
UPDATE lead_partner_payout_accounts
SET is_verified = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE is_active = TRUE;
