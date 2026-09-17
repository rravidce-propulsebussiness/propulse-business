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
-- payout items. The payout-item table remains the source of truth for totals.
UPDATE lead_partner_earnings e
SET payout_id = x.payout_id,
    updated_at = CURRENT_TIMESTAMP
FROM (
  SELECT earning_id, MAX(payout_id) AS payout_id
  FROM lead_partner_payout_items
  GROUP BY earning_id
) x
WHERE e.id = x.earning_id
  AND e.payout_id IS DISTINCT FROM x.payout_id;
