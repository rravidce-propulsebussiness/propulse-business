-- Finalize payout/earning integrity after payout request and item tables exist.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lp_payout_item_earning
  ON lead_partner_payout_items(payout_id, earning_id);

CREATE INDEX IF NOT EXISTS idx_lp_payout_requests_status_processed
  ON lead_partner_payout_requests(status, processed_at DESC, id DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lead_partner_payout_items_amount_positive'
  ) THEN
    ALTER TABLE lead_partner_payout_items
      ADD CONSTRAINT lead_partner_payout_items_amount_positive
      CHECK (amount > 0);
  END IF;
END $$;

UPDATE lead_partner_earnings e
SET payout_id = x.payout_id,
    updated_at = CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (earning_id) earning_id, payout_id
  FROM lead_partner_payout_items
  ORDER BY earning_id, payout_id DESC, id DESC
) x
WHERE e.id = x.earning_id
  AND e.payout_id IS DISTINCT FROM x.payout_id;
