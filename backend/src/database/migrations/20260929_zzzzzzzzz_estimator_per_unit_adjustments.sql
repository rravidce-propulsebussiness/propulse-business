-- Support material/specification price adjustments that scale by an Admin-selected quantity.
-- This enables brochure-style additions such as an extra amount per sq ft while keeping
-- the same versioned estimator adjustment engine.

ALTER TABLE estimator_adjustments
  ADD COLUMN IF NOT EXISTS unit_question_key VARCHAR(80);

DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid='estimator_adjustments'::regclass
       AND contype='c'
       AND pg_get_constraintdef(oid) ILIKE '%adjustment_type%'
  LOOP
    EXECUTE format('ALTER TABLE estimator_adjustments DROP CONSTRAINT %I',constraint_row.conname);
  END LOOP;
END $$;

ALTER TABLE estimator_adjustments
  DROP CONSTRAINT IF EXISTS estimator_adjustments_type_check,
  DROP CONSTRAINT IF EXISTS estimator_adjustments_unit_question_check,
  DROP CONSTRAINT IF EXISTS estimator_adjustments_value_type_check;

ALTER TABLE estimator_adjustments
  ADD CONSTRAINT estimator_adjustments_type_check
    CHECK (adjustment_type IN ('fixed','percent','per_unit')),
  ADD CONSTRAINT estimator_adjustments_unit_question_check
    CHECK (
      (adjustment_type='per_unit' AND unit_question_key ~ '^[a-z][a-z0-9_]{1,79}$')
      OR
      (adjustment_type IN ('fixed','percent') AND unit_question_key IS NULL)
    ),
  ADD CONSTRAINT estimator_adjustments_value_type_check
    CHECK (
      (adjustment_type IN ('fixed','per_unit') AND value_min >= 0)
      OR
      (adjustment_type='percent' AND value_min > -100 AND value_max <= 1000)
    );

CREATE INDEX IF NOT EXISTS idx_estimator_adjustments_unit_question
  ON estimator_adjustments(version_id,unit_question_key)
  WHERE adjustment_type='per_unit' AND is_active=TRUE;
