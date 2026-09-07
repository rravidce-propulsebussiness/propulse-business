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
    WHERE rel.relname = 'investments'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE investments DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'investments_status_check'
  ) THEN
    ALTER TABLE investments
      ADD CONSTRAINT investments_status_check
      CHECK (status IN ('pending','active','matured','paid','cancelled','rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_investments_payment_id ON investments(payment_id);
