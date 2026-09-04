-- Keep one canonical membership plan for each semantic plan type/group/billing period.
-- Existing memberships and payments are repointed to the canonical row before duplicates are removed.
DO $$
DECLARE
  dup RECORD;
  fk RECORD;
  keep_id INTEGER;
BEGIN
  FOR dup IN
    SELECT plan_type,
           lower(trim(COALESCE(plan_group, regexp_replace(name, '\\s+[^\\s]+$','')))) AS group_key,
           COALESCE(billing_months, CASE WHEN duration_days >= 365 THEN 12 ELSE GREATEST(1, ROUND(duration_days / 30.0)) END) AS months,
           array_agg(id ORDER BY is_active DESC, updated_at DESC NULLS LAST, id DESC) AS ids
    FROM membership_plans
    GROUP BY plan_type,
             lower(trim(COALESCE(plan_group, regexp_replace(name, '\\s+[^\\s]+$','')))),
             COALESCE(billing_months, CASE WHEN duration_days >= 365 THEN 12 ELSE GREATEST(1, ROUND(duration_days / 30.0)) END)
    HAVING COUNT(*) > 1
  LOOP
    keep_id := dup.ids[1];

    FOR fk IN
      SELECT n.nspname AS schema_name, c.relname AS table_name, a.attname AS column_name
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN unnest(con.conkey) WITH ORDINALITY k(attnum, ord) ON TRUE
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
      JOIN pg_class p ON p.oid = con.confrelid
      WHERE con.contype = 'f'
        AND p.relname = 'membership_plans'
        AND n.nspname = 'public'
        AND array_length(con.conkey,1) = 1
    LOOP
      EXECUTE format('UPDATE %I.%I SET %I = $1 WHERE %I = ANY($2)', fk.schema_name, fk.table_name, fk.column_name, fk.column_name)
        USING keep_id, dup.ids[2:array_length(dup.ids,1)];
    END LOOP;

    DELETE FROM membership_plans WHERE id = ANY(dup.ids[2:array_length(dup.ids,1)]);
  END LOOP;
END $$;

-- Prevent the same plan type/group/billing period from being recreated under a
-- different display name or letter casing. NULL billing_months is normalized to
-- the legacy duration-based period before the constraint is created.
UPDATE membership_plans
SET plan_group = COALESCE(NULLIF(trim(plan_group), ''), regexp_replace(name, '\\s+[^\\s]+$','')),
    billing_months = COALESCE(billing_months, CASE WHEN duration_days >= 365 THEN 12 ELSE GREATEST(1, ROUND(duration_days / 30.0)) END)
WHERE plan_group IS NULL OR trim(plan_group) = '' OR billing_months IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_plan_semantic_period
  ON membership_plans (plan_type, lower(trim(plan_group)), billing_months);
