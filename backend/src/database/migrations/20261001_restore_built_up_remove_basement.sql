-- Public construction intake:
-- 1) Basement is no longer asked.
-- 2) Built-up area returns as an editable field. The frontend pre-fills it from
--    plot-size range x 9 sq ft per sq yard x selected floor count.

UPDATE customer_flow_questions q
SET is_required=FALSE,
    is_active=FALSE,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='build'
  AND v.status IN ('published','draft')
  AND q.question_key='basement';

UPDATE customer_flow_questions q
SET question_type='area',
    label='Planned total built-up area',
    help_text='Auto-calculated from plot area and floors. You can edit this value.',
    is_required=TRUE,
    is_active=TRUE,
    display_order=50,
    validation='{"min":50,"max":1000000}'::jsonb,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='build'
  AND v.status IN ('published','draft')
  AND q.question_key='built_up_area';

UPDATE customer_flow_questions q
SET display_order=60,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='build'
  AND v.status IN ('published','draft')
  AND q.question_key='floors';

UPDATE customer_flow_questions q
SET display_order=70,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='build'
  AND v.status IN ('published','draft')
  AND q.question_key='site_access';
