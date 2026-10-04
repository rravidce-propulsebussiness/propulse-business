-- Add richer interior requirement questions used by the public /design experience.
-- These remain Admin-visible/editable because they are normal customer-flow questions/options.

WITH target AS (
  SELECT v.id AS version_id
  FROM customer_flow_definitions d
  JOIN customer_flow_versions v ON v.definition_id=d.id
  WHERE d.key='design' AND v.status='published'
  ORDER BY v.version_no DESC
  LIMIT 1
)
INSERT INTO customer_flow_questions
  (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
SELECT version_id,'rooms','multi_select','Rooms to Design','Select the rooms that are part of your interior requirement.',TRUE,45,
       '{"minItems":1,"maxItems":8}'::jsonb,'{}'::jsonb,NULL,'marketplace',TRUE
FROM target
ON CONFLICT(version_id,question_key) DO UPDATE
SET question_type=EXCLUDED.question_type,
    label=EXCLUDED.label,
    help_text=EXCLUDED.help_text,
    is_required=EXCLUDED.is_required,
    display_order=EXCLUDED.display_order,
    validation=EXCLUDED.validation,
    show_when=EXCLUDED.show_when,
    visibility=EXCLUDED.visibility,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

WITH target AS (
  SELECT v.id AS version_id
  FROM customer_flow_definitions d
  JOIN customer_flow_versions v ON v.definition_id=d.id
  WHERE d.key='design' AND v.status='published'
  ORDER BY v.version_no DESC
  LIMIT 1
)
INSERT INTO customer_flow_questions
  (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
SELECT version_id,'design_style','multi_select','Interior Style Preference','Choose one or more styles you like.',FALSE,115,
       '{"minItems":0,"maxItems":5}'::jsonb,'{}'::jsonb,NULL,'marketplace',TRUE
FROM target
ON CONFLICT(version_id,question_key) DO UPDATE
SET question_type=EXCLUDED.question_type,
    label=EXCLUDED.label,
    help_text=EXCLUDED.help_text,
    display_order=EXCLUDED.display_order,
    validation=EXCLUDED.validation,
    show_when=EXCLUDED.show_when,
    visibility=EXCLUDED.visibility,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

WITH option_rows(question_key,value,label,display_order) AS (
  VALUES
    ('rooms','living_room','Living Room',10),
    ('rooms','bedroom','Bedroom',20),
    ('rooms','kitchen','Kitchen',30),
    ('rooms','bathroom','Bathroom',40),
    ('rooms','dining','Dining',50),
    ('rooms','other','Other',60),
    ('design_style','modern','Modern',10),
    ('design_style','minimalist','Minimalist',20),
    ('design_style','contemporary','Contemporary',30),
    ('design_style','traditional','Traditional',40),
    ('design_style','luxury','Luxury',50)
),
target AS (
  SELECT q.id AS question_id,q.question_key
  FROM customer_flow_definitions d
  JOIN customer_flow_versions v ON v.definition_id=d.id AND v.status='published'
  JOIN customer_flow_questions q ON q.version_id=v.id
  WHERE d.key='design'
    AND q.question_key IN ('rooms','design_style')
    AND v.version_no=(SELECT MAX(v2.version_no) FROM customer_flow_versions v2 WHERE v2.definition_id=d.id AND v2.status='published')
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
SELECT t.question_id,o.value,o.label,o.display_order,TRUE
FROM option_rows o
JOIN target t ON t.question_key=o.question_key
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;
