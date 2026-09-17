BEGIN;

-- commission_percent is the ProPulse/platform commission.
-- Existing unpaid partner earnings were created with the old formula
-- (gross * commission_percent). Recalculate only earnings that are still
-- available so already-paid historical payouts are not changed.
UPDATE lead_partner_earnings
SET earning_amount=ROUND(gross_sale_amount-(gross_sale_amount*commission_percent/100),2),
    updated_at=CURRENT_TIMESTAMP
WHERE status='available'
  AND earning_amount<>ROUND(gross_sale_amount-(gross_sale_amount*commission_percent/100),2);

COMMIT;
