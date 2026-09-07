DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'payments'
      AND con.contype = 'c'
      AND att.attname = 'purchase_type'
  LOOP
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE payments
  ADD CONSTRAINT payments_purchase_type_check
  CHECK (purchase_type IS NULL OR purchase_type IN ('membership','lead','booster','investment'));

ALTER TABLE investments
  ADD COLUMN IF NOT EXISTS payment_id INTEGER;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'investments'
      AND con.contype = 'c'
      AND att.attname = 'status'
  LOOP
    EXECUTE format('ALTER TABLE investments DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE investments
  ADD CONSTRAINT investments_status_check
  CHECK (status IN ('pending','active','matured','paid','cancelled','rejected'));

CREATE INDEX IF NOT EXISTS idx_investments_payment_id ON investments(payment_id);
