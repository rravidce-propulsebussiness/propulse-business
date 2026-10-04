-- Interior requests do not generate an instant quotation.
-- Keep package selection aligned with the public Packages page.

UPDATE customer_flow_questions q
SET question_type='single_select',
    label='Choose Interior Package',
    help_text='Choose the package you prefer. Final project pricing is confirmed after measurements and scope review.',
    is_required=TRUE,
    is_active=TRUE,
    display_order=80,
    validation='{}'::jsonb,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='design'
  AND v.status IN ('published','draft')
  AND q.question_key='finish_quality';

WITH package_questions AS (
  SELECT q.id
  FROM customer_flow_questions q
  JOIN customer_flow_versions v ON v.id=q.version_id
  JOIN customer_flow_definitions d ON d.id=v.definition_id
  WHERE d.key='design'
    AND v.status IN ('published','draft')
    AND q.question_key='finish_quality'
)
UPDATE customer_flow_question_options
SET is_active=FALSE,
    updated_at=CURRENT_TIMESTAMP
WHERE question_id IN (SELECT id FROM package_questions);

WITH package_questions AS (
  SELECT q.id
  FROM customer_flow_questions q
  JOIN customer_flow_versions v ON v.id=q.version_id
  JOIN customer_flow_definitions d ON d.id=v.definition_id
  WHERE d.key='design'
    AND v.status IN ('published','draft')
    AND q.question_key='finish_quality'
),
package_options(value,label,display_order) AS (
  VALUES
    ('standard','Standard',10),
    ('premium','Premium',20)
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
SELECT q.id,o.value,o.label,o.display_order,TRUE
FROM package_questions q
CROSS JOIN package_options o
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;
