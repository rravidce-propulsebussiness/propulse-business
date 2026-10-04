-- Streamline the public interior-design requirement flow:
-- BHK + End-to-End vs Selected Work, with item selection only for Selected Work.

UPDATE customer_flow_questions q
SET question_type='single_select',
    label='Home configuration',
    help_text='Select the closest BHK configuration.',
    is_required=TRUE,
    is_active=TRUE,
    display_order=30,
    validation='{}'::jsonb,
    show_when='{"questionKey":"property_type","in":["apartment","villa","independent_house"]}'::jsonb,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='design'
  AND v.status IN ('published','draft')
  AND q.question_key='bhk';

UPDATE customer_flow_questions q
SET question_type='single_select',
    label='What interior scope do you need?',
    help_text='Choose end-to-end interiors or select only the work you need.',
    is_required=TRUE,
    is_active=TRUE,
    display_order=60,
    validation='{}'::jsonb,
    show_when='{}'::jsonb,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='design'
  AND v.status IN ('published','draft')
  AND q.question_key='interior_scope';

INSERT INTO customer_flow_questions
  (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
SELECT
  v.id,
  'selected_work',
  'multi_select',
  'Select the interior work you need',
  'Choose one or more items when you do not need end-to-end interiors.',
  TRUE,
  70,
  '{"minItems":1,"maxItems":10}'::jsonb,
  '{"questionKey":"interior_scope","equals":"selected_work"}'::jsonb,
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
    is_required=EXCLUDED.is_required,
    display_order=EXCLUDED.display_order,
    validation=EXCLUDED.validation,
    show_when=EXCLUDED.show_when,
    lead_field=EXCLUDED.lead_field,
    visibility=EXCLUDED.visibility,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

UPDATE customer_flow_questions q
SET is_required=FALSE,
    is_active=FALSE,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='design'
  AND v.status IN ('published','draft')
  AND q.question_key IN ('area','rooms','property_status','possession_status','kitchen','wardrobes','false_ceiling','furniture');

WITH targets AS (
  SELECT q.id
  FROM customer_flow_questions q
  JOIN customer_flow_versions v ON v.id=q.version_id
  JOIN customer_flow_definitions d ON d.id=v.definition_id
  WHERE d.key='design'
    AND v.status IN ('published','draft')
    AND q.question_key IN ('interior_scope','selected_work')
)
UPDATE customer_flow_question_options
SET is_active=FALSE,
    updated_at=CURRENT_TIMESTAMP
WHERE question_id IN (SELECT id FROM targets);

WITH scope_questions AS (
  SELECT q.id
  FROM customer_flow_questions q
  JOIN customer_flow_versions v ON v.id=q.version_id
  JOIN customer_flow_definitions d ON d.id=v.definition_id
  WHERE d.key='design'
    AND v.status IN ('published','draft')
    AND q.question_key='interior_scope'
),
scope_options(value,label,display_order) AS (
  VALUES
    ('end_to_end','End-to-End Interiors',10),
    ('selected_work','Select Specific Work',20)
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
SELECT q.id,o.value,o.label,o.display_order,TRUE
FROM scope_questions q
CROSS JOIN scope_options o
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

WITH work_questions AS (
  SELECT q.id
  FROM customer_flow_questions q
  JOIN customer_flow_versions v ON v.id=q.version_id
  JOIN customer_flow_definitions d ON d.id=v.definition_id
  WHERE d.key='design'
    AND v.status IN ('published','draft')
    AND q.question_key='selected_work'
),
work_options(value,label,display_order) AS (
  VALUES
    ('modular_kitchen','Modular Kitchen',10),
    ('wardrobes','Wardrobes',20),
    ('tv_unit','TV Unit',30),
    ('false_ceiling','False Ceiling',40),
    ('furniture','Furniture',50),
    ('lighting','Lighting',60),
    ('painting','Painting / Wall Finish',70),
    ('pooja_unit','Pooja Unit',80),
    ('study_unit','Study Unit',90),
    ('crockery_unit','Crockery Unit',100)
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
SELECT q.id,o.value,o.label,o.display_order,TRUE
FROM work_questions q
CROSS JOIN work_options o
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

UPDATE customer_flow_questions q
SET is_active=TRUE,
    is_required=TRUE,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='design'
  AND v.status IN ('published','draft')
  AND q.question_key IN ('finish_quality','timeline');

UPDATE customer_flow_questions q
SET is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='design'
  AND v.status IN ('published','draft')
  AND q.question_key='budget';
