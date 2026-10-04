-- Replace free-text construction budget with a clear dropdown range.

UPDATE customer_flow_questions q
SET question_type='single_select',
    label='What is your approximate budget?',
    help_text='An approximate range helps businesses respond appropriately.',
    is_required=FALSE,
    validation='{}'::jsonb,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='build'
  AND v.status IN ('published','draft')
  AND q.question_key='budget';

WITH target_questions AS (
  SELECT q.id
  FROM customer_flow_questions q
  JOIN customer_flow_versions v ON v.id=q.version_id
  JOIN customer_flow_definitions d ON d.id=v.definition_id
  WHERE d.key='build'
    AND v.status IN ('published','draft')
    AND q.question_key='budget'
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
    AND q.question_key='budget'
),
budget_ranges(value,label,display_order) AS (
  VALUES
    ('under_25_lakh','Below ₹25 lakh',10),
    ('25_50_lakh','₹25–50 lakh',20),
    ('50_lakh_1_cr','₹50 lakh–₹1 crore',30),
    ('above_1_cr','Above ₹1 crore',40)
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
SELECT q.id,b.value,b.label,b.display_order,TRUE
FROM target_questions q
CROSS JOIN budget_ranges b
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;
