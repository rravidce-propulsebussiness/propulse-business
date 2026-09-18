CREATE UNIQUE INDEX IF NOT EXISTS uq_lp_active_payout_account_user
  ON lead_partner_payout_accounts(user_id)
  WHERE is_active=TRUE;
