-- Ensure the public interior-design flow always has a bedroom/BHK dropdown
-- for residential property types.

INSERT INTO customer_flow_questions
  (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
SELECT
  v.id,
  'bhk',
  'single_select',
  'Number of Bedrooms',
  'Select your home configuration.',
  TRUE,
  30,
  '{}'::jsonb,
  '{"questionKey":"property_type","in":["apartment","villa","independent_house"]}'::jsonb,
  NULL,
  'marketplace',
  TRUE
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE d.key='design'
  AND v.status IN ('published','draft')
ON CONFLICT(version_id,question_key) DO UPDATE
SET question_type=EXCLUDED.question_type,
    label=EXCLUDED.label,
    help_text=EXCLUDED.help_text,
    is_required=TRUE,
    display_order=EXCLUDED.display_order,
    validation=EXCLUDED.validation,
    show_when=EXCLUDED.show_when,
    visibility=EXCLUDED.visibility,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

WITH bhk_questions AS (
  SELECT q.id
  FROM customer_flow_questions q
  JOIN customer_flow_versions v ON v.id=q.version_id
  JOIN customer_flow_definitions d ON d.id=v.definition_id
  WHERE d.key='design'
    AND v.status IN ('published','draft')
    AND q.question_key='bhk'
)
UPDATE customer_flow_question_options
SET is_active=FALSE,
    updated_at=CURRENT_TIMESTAMP
WHERE question_id IN (SELECT id FROM bhk_questions);

WITH bhk_questions AS (
  SELECT q.id
  FROM customer_flow_questions q
  JOIN customer_flow_versions v ON v.id=q.version_id
  JOIN customer_flow_definitions d ON d.id=v.definition_id
  WHERE d.key='design'
    AND v.status IN ('published','draft')
    AND q.question_key='bhk'
),
bhk_options(value,label,display_order) AS (
  VALUES
    ('1bhk','1 BHK',10),
    ('2bhk','2 BHK',20),
    ('3bhk','3 BHK',30),
    ('4bhk','4 BHK',40),
    ('5plus','5+ BHK',50)
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
SELECT q.id,o.value,o.label,o.display_order,TRUE
FROM bhk_questions q
CROSS JOIN bhk_options o
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;
