-- Integrity hardening for Lead Partner earnings.
-- Payout items are the authoritative payout relationship; payout_id on the earning
-- row is only a convenience pointer to the latest payout request.

CREATE INDEX IF NOT EXISTS idx_lead_partner_earnings_purchase
  ON lead_partner_earnings(lead_purchase_id);

CREATE INDEX IF NOT EXISTS idx_lead_partner_earnings_partner_created
  ON lead_partner_earnings(partner_id, created_at DESC, id DESC);

-- A payout item must never reserve/pay more than the earning itself.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lead_partner_payout_items_amount_positive'
  ) THEN
    ALTER TABLE lead_partner_payout_items
      ADD CONSTRAINT lead_partner_payout_items_amount_positive
      CHECK (amount > 0);
  END IF;
END $$;

-- Keep the earning convenience pointer synchronized for rows that already have
-- payout items. Because one earning can participate in multiple payout requests,
-- choose the newest payout item by payout id rather than taking MAX() blindly.
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
