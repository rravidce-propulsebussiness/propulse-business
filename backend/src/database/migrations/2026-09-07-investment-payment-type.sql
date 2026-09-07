BEGIN;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_purchase_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_purchase_type_check
  CHECK (purchase_type IS NULL OR purchase_type IN ('membership','lead','booster','investment'));

COMMIT;
