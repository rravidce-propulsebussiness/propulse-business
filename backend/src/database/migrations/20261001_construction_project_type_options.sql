-- Normalize homeowner construction project types to four clear choices.
-- Applies to the editable/published "build" requirement flow without changing historical retired versions.

WITH target_questions AS (
  SELECT q.id
  FROM customer_flow_definitions d
  JOIN customer_flow_versions v
    ON v.definition_id=d.id
   AND v.status IN ('published','draft')
  JOIN customer_flow_questions q
    ON q.version_id=v.id
   AND q.question_key='project_type'
  WHERE d.key='build'
)
UPDATE customer_flow_question_options o
SET is_active=FALSE,
    updated_at=CURRENT_TIMESTAMP
WHERE o.question_id IN (SELECT id FROM target_questions);

WITH target_questions AS (
  SELECT q.id
  FROM customer_flow_definitions d
  JOIN customer_flow_versions v
    ON v.definition_id=d.id
   AND v.status IN ('published','draft')
  JOIN customer_flow_questions q
    ON q.version_id=v.id
   AND q.question_key='project_type'
  WHERE d.key='build'
),
option_rows(value,label,display_order) AS (
  VALUES
    ('residential','Residential',10),
    ('commercial','Commercial',20),
    ('renovation','Renovation',30),
    ('extension','Extension',40)
)
INSERT INTO customer_flow_question_options
  (question_id,value,label,display_order,is_active)
SELECT q.id,o.value,o.label,o.display_order,TRUE
FROM target_questions q
CROSS JOIN option_rows o
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;
