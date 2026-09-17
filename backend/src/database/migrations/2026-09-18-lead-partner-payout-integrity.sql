CREATE UNIQUE INDEX IF NOT EXISTS uq_lp_payout_item_earning
  ON lead_partner_payout_items(payout_id, earning_id);

CREATE INDEX IF NOT EXISTS idx_lp_payout_requests_status_processed
  ON lead_partner_payout_requests(status, processed_at DESC, id DESC);
