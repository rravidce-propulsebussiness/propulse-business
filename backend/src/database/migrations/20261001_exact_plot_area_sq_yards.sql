-- Collect exact construction plot area as a numeric square-yard value.
-- This replaces the temporary plot-area range selector.

UPDATE customer_flow_questions q
SET question_type='area',
    label='What is the plot area?',
    help_text='Enter the plot area in sq yards.',
    is_required=TRUE,
    is_active=TRUE,
    display_order=40,
    validation='{"min":10,"max":100000}'::jsonb,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='build'
  AND v.status IN ('published','draft')
  AND q.question_key='plot_area';

WITH target_questions AS (
  SELECT q.id
  FROM customer_flow_questions q
  JOIN customer_flow_versions v ON v.id=q.version_id
  JOIN customer_flow_definitions d ON d.id=v.definition_id
  WHERE d.key='build'
    AND v.status IN ('published','draft')
    AND q.question_key='plot_area'
)
UPDATE customer_flow_question_options
SET is_active=FALSE,
    updated_at=CURRENT_TIMESTAMP
WHERE question_id IN (SELECT id FROM target_questions);
