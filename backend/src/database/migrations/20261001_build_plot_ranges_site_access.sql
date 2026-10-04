-- Simplify the public construction intake:
-- - Plot area is collected as a sq-yard range.
-- - Exact built-up area is no longer requested in the lead form.
-- - Site access is collected alongside plot ownership, plot size and floors.

UPDATE customer_flow_questions q
SET question_type='single_select',
    label='What is the plot area?',
    help_text='Select the approximate plot area in sq yards.',
    is_required=TRUE,
    display_order=40,
    validation='{}'::jsonb,
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

WITH target_questions AS (
  SELECT q.id
  FROM customer_flow_questions q
  JOIN customer_flow_versions v ON v.id=q.version_id
  JOIN customer_flow_definitions d ON d.id=v.definition_id
  WHERE d.key='build'
    AND v.status IN ('published','draft')
    AND q.question_key='plot_area'
),
ranges(value,label,display_order) AS (
  VALUES
    ('under_100','Less than 100 sq yards',10),
    ('100_200','100–200 sq yards',20),
    ('above_200','Above 200 sq yards',30)
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
SELECT q.id,r.value,r.label,r.display_order,TRUE
FROM target_questions q
CROSS JOIN ranges r
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

UPDATE customer_flow_questions q
SET is_required=FALSE,
    is_active=FALSE,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='build'
  AND v.status IN ('published','draft')
  AND q.question_key='built_up_area';

UPDATE customer_flow_questions q
SET is_required=TRUE,
    is_active=TRUE,
    display_order=50,
    label='How is the site access?',
    help_text='Restricted or narrow access can increase material handling and labour cost.',
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='build'
  AND v.status IN ('published','draft')
  AND q.question_key='site_access';

UPDATE customer_flow_questions q
SET display_order=60,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='build'
  AND v.status IN ('published','draft')
  AND q.question_key='floors';
