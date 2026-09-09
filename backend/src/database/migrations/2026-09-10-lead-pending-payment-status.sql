-- Direct lead purchases may remain pending until an admin approves the external payment.
-- Keep the purchase status constraint aligned with the current payment workflow.
ALTER TABLE lead_purchases
  DROP CONSTRAINT IF EXISTS lead_purchases_status_check;

ALTER TABLE lead_purchases
  ADD CONSTRAINT lead_purchases_status_check
  CHECK (status IN ('paid','pending_payment','refunded','cancelled'));

CREATE INDEX IF NOT EXISTS idx_lead_purchases_status
  ON lead_purchases(lead_id,status);
