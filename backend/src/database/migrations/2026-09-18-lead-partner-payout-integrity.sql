-- This migration sorts before payout requests on a fresh install.
-- Defer the indexes until the payout tables exist; the finalizer migration
-- applies them after lead_partner_payout_requests/items are created.
DO $$
BEGIN
  IF to_regclass('lead_partner_payout_items') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_lp_payout_item_earning
      ON lead_partner_payout_items(payout_id, earning_id);
  END IF;
  IF to_regclass('lead_partner_payout_requests') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_lp_payout_requests_status_processed
      ON lead_partner_payout_requests(status, processed_at DESC, id DESC);
  END IF;
END $$;
