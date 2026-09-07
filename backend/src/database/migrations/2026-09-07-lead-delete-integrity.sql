BEGIN;

-- Lead purchases must not block an admin lead clear/delete.
-- Keep membership claims aligned with their existing ON DELETE CASCADE behavior.
DO $$
DECLARE
  fk_name text;
BEGIN
  IF to_regclass('public.lead_purchases') IS NOT NULL AND to_regclass('public.leads') IS NOT NULL THEN
    FOR fk_name IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class child ON child.oid = con.conrelid
      JOIN pg_class parent ON parent.oid = con.confrelid
      JOIN pg_namespace ns ON ns.oid = child.relnamespace
      WHERE con.contype = 'f'
        AND ns.nspname = 'public'
        AND child.relname = 'lead_purchases'
        AND parent.relname = 'leads'
    LOOP
      EXECUTE format('ALTER TABLE public.lead_purchases DROP CONSTRAINT %I', fk_name);
    END LOOP;

    ALTER TABLE public.lead_purchases
      ADD CONSTRAINT lead_purchases_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;
