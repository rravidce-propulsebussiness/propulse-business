BEGIN;

-- Normalize legacy empty purchase_type values before enforcing the unified enum.
UPDATE payments SET purchase_type=NULL WHERE BTRIM(COALESCE(purchase_type,''))='';

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_purchase_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_purchase_type_check
  CHECK (purchase_type IS NULL OR purchase_type IN ('membership','lead','booster','investment','wallet_topup'));

COMMIT;
