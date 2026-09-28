-- propulse:no-transaction\n-- Production hot-path indexes for finance queues and investor settlement scans.
-- Keep these targeted: older migrations already index generic payment and wallet user history paths.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_topups_status_created_id
  ON wallet_topups(status, created_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lp_payout_requests_status_queue
  ON lead_partner_payout_requests(status, requested_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investor_payout_requests_status_queue
  ON investor_payout_requests(status, requested_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investor_payout_requests_user_requested
  ON investor_payout_requests(user_id, requested_at DESC, id DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lp_earnings_partner_status_created
  ON lead_partner_earnings(partner_id, status, created_at, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investments_ready_for_transfer
  ON investments(user_id, matures_at, id)
  WHERE status IN ('active','matured')
    AND COALESCE(reinvestment_enabled,FALSE)=FALSE;
