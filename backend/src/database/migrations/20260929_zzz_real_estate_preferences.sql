-- Extend the published Real Estate customer flow with property preference options
-- used by the premium public /property requirement experience.

WITH target AS (
  SELECT v.id AS version_id
  FROM customer_flow_definitions d
  JOIN customer_flow_versions v ON v.definition_id=d.id
  WHERE d.key='property' AND v.status='published'
  ORDER BY v.version_no DESC
  LIMIT 1
)
INSERT INTO customer_flow_questions
  (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
SELECT version_id,'property_preferences','multi_select','Property Preferences',
       'Choose any property features that matter to you.',FALSE,65,
       '{"minItems":0,"maxItems":8}'::jsonb,'{}'::jsonb,NULL,'marketplace',TRUE
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

WITH option_rows(value,label,display_order) AS (
  VALUES
    ('ready_move','Ready to Move',10),
    ('under_construction','Under Construction',20),
    ('new_launch','New Launch',30),
    ('resale','Resale',40),
    ('gated_community','Gated Community',50),
    ('near_metro','Near Metro / Transport',60),
    ('amenities','With Amenities',70),
    ('corner_view','Corner / Good View',80)
),
target AS (
  SELECT q.id AS question_id
  FROM customer_flow_definitions d
  JOIN customer_flow_versions v ON v.definition_id=d.id AND v.status='published'
  JOIN customer_flow_questions q ON q.version_id=v.id AND q.question_key='property_preferences'
  WHERE d.key='property'
    AND v.version_no=(SELECT MAX(v2.version_no) FROM customer_flow_versions v2 WHERE v2.definition_id=d.id AND v2.status='published')
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
SELECT t.question_id,o.value,o.label,o.display_order,TRUE
FROM option_rows o
CROSS JOIN target t
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;
