-- Make estimator calculation submissions idempotent and link every completed estimate to one canonical lead.
ALTER TABLE estimator_calculations
  ADD COLUMN IF NOT EXISTS intake_submission_key VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS uq_estimator_calculations_intake_submission_key
  ON estimator_calculations(intake_submission_key)
  WHERE intake_submission_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estimator_calculations_unconverted_lead
  ON estimator_calculations(lead_id,converted_at,created_at DESC)
  WHERE lead_id IS NOT NULL AND converted_at IS NULL;
