-- Preserve the exact line-item calculation used for each customer estimate.
-- Historical rows default to an empty array; new estimates save the immutable breakdown.

ALTER TABLE estimator_calculations
  ADD COLUMN IF NOT EXISTS breakdown JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE estimator_calculations
  DROP CONSTRAINT IF EXISTS estimator_calculations_breakdown_array_check;

ALTER TABLE estimator_calculations
  ADD CONSTRAINT estimator_calculations_breakdown_array_check
  CHECK (jsonb_typeof(breakdown)='array');
