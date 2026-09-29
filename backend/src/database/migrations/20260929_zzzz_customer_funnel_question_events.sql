-- Question-level customer funnel diagnostics.
-- Stores configured question identifiers and numeric positions only; never answer values.

ALTER TABLE customer_funnel_events
  ADD COLUMN IF NOT EXISTS question_key VARCHAR(80),
  ADD COLUMN IF NOT EXISTS question_index SMALLINT,
  ADD COLUMN IF NOT EXISTS question_count SMALLINT;

ALTER TABLE customer_funnel_events
  DROP CONSTRAINT IF EXISTS customer_funnel_events_event_type_check;

ALTER TABLE customer_funnel_events
  ADD CONSTRAINT customer_funnel_events_event_type_check
  CHECK (event_type IN (
    'home_cta_clicked',
    'flow_opened',
    'flow_started',
    'flow_question_viewed',
    'flow_question_completed',
    'estimate_completed',
    'quote_form_opened',
    'quote_submitted',
    'requirement_contact_opened',
    'requirement_submitted'
  ));

ALTER TABLE customer_funnel_events
  DROP CONSTRAINT IF EXISTS customer_funnel_events_question_shape_check;

ALTER TABLE customer_funnel_events
  ADD CONSTRAINT customer_funnel_events_question_shape_check
  CHECK (
    (
      event_type IN ('flow_question_viewed','flow_question_completed')
      AND question_key IS NOT NULL
      AND question_key ~ '^[a-z][a-z0-9_]{1,79}$'
      AND question_index BETWEEN 1 AND 1000
      AND question_count BETWEEN 1 AND 1000
      AND question_index <= question_count
    )
    OR
    (
      event_type NOT IN ('flow_question_viewed','flow_question_completed')
      AND question_key IS NULL
      AND question_index IS NULL
      AND question_count IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_customer_funnel_events_question
  ON customer_funnel_events(flow_key,question_key,event_type,created_at DESC)
  WHERE question_key IS NOT NULL;
