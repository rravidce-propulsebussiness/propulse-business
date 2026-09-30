UPDATE customer_flow_definitions
SET name='Construction Quotation', updated_at=CURRENT_TIMESTAMP
WHERE key='build' AND flow_type='requirement';

-- Make the public construction flow quotation-ready.
-- The homepage popup remains a quick requirement capture; /build collects the
-- additional pricing inputs needed by the existing Admin-managed estimator.

UPDATE customer_flow_versions v
SET config = COALESCE(v.config,'{}'::jsonb)
    || jsonb_build_object(
      'headline','Get your construction quotation',
      'subheadline','Share the project size, scope and specification level to generate a detailed planning quotation.',
      'submitLabel','Generate Detailed Quotation',
      'quotationMode',TRUE
    ),
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_definitions d
WHERE d.id=v.definition_id
  AND d.key='build'
  AND v.status IN ('published','draft');

UPDATE customer_flow_questions q
SET is_required=TRUE,
    label='Planned total built-up area',
    help_text='Enter the total construction area across all planned floors. This is required to calculate the quotation.',
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='build'
  AND v.status IN ('published','draft')
  AND q.question_key='built_up_area';

INSERT INTO customer_flow_questions
  (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
SELECT
  v.id,
  x.question_key,
  x.question_type,
  x.label,
  x.help_text,
  x.is_required,
  x.display_order,
  x.validation::jsonb,
  x.show_when::jsonb,
  NULL,
  'marketplace',
  TRUE
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
CROSS JOIN (VALUES
  ('basement','boolean','Does the project include a basement?','Basements affect excavation, structure and waterproofing cost.',TRUE,92,'{}','{}'),
  ('site_access','single_select','How is the site access?','Restricted or narrow access can increase material handling and labour cost.',TRUE,94,'{}','{}')
) AS x(question_key,question_type,label,help_text,is_required,display_order,validation,show_when)
WHERE d.key='build'
  AND v.status IN ('published','draft')
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

WITH rows(value,label,display_order) AS (
  VALUES
    ('normal','Normal site access',10),
    ('restricted','Restricted / narrow access',20)
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
SELECT q.id,r.value,r.label,r.display_order,TRUE
FROM rows r
JOIN customer_flow_definitions d ON d.key='build'
JOIN customer_flow_versions v ON v.definition_id=d.id AND v.status IN ('published','draft')
JOIN customer_flow_questions q ON q.version_id=v.id AND q.question_key='site_access'
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;
