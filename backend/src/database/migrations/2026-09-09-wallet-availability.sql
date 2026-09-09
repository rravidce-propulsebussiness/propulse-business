BEGIN;

-- Speeds up the customer wallet's available-balance calculation.
-- Only submitted pending lead payments can reserve wallet funds.
CREATE INDEX IF NOT EXISTS idx_payments_pending_lead_wallet_reservation
  ON payments(user_id, created_at DESC)
  WHERE purchase_type='lead'
    AND status='pending'
    AND wallet_amount>0
    AND (COALESCE(BTRIM(manual_reference),'')<>'' OR COALESCE(BTRIM(proof_url),'')<>'');

COMMIT;
