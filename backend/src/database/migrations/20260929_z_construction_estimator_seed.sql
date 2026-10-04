-- Phase 4: Construction Cost Estimator.
-- Seeds only when this estimator definition has no versions.
-- Starter amounts are planning assumptions and remain Admin-editable/versioned.

WITH scope AS (
  SELECT i.id AS industry_id,
         s.id AS service_id
  FROM industries i
  JOIN services s ON s.industry_id=i.id AND s.is_active=TRUE
  WHERE i.is_active=TRUE
    AND (
      LOWER(COALESCE(i.slug,'')) IN ('construction','construction-services','civil-construction')
      OR LOWER(i.name)='construction'
      OR LOWER(i.name) LIKE '%construction%'
    )
    AND (
      LOWER(COALESCE(s.slug,'')) IN ('building-contractors','civil-construction','house-construction','construction')
      OR LOWER(s.name) IN ('building contractors','civil construction','house construction','construction')
      OR LOWER(s.name) LIKE '%building%contract%'
      OR LOWER(s.name) LIKE '%construction%'
    )
  ORDER BY
    CASE WHEN LOWER(COALESCE(i.slug,''))='construction' THEN 0 ELSE 1 END,
    CASE WHEN LOWER(COALESCE(s.slug,''))='building-contractors' THEN 0
         WHEN LOWER(s.name)='building contractors' THEN 1
         WHEN LOWER(COALESCE(s.slug,''))='civil-construction' THEN 2
         ELSE 3 END,
    i.id,s.id
  LIMIT 1
)
INSERT INTO customer_flow_definitions
  (key,name,flow_type,industry_id,service_id,subservice_id,is_active)
SELECT
  'construction-cost-estimator',
  'Construction Cost Estimator',
  'estimator',
  industry_id,
  service_id,
  NULL,
  TRUE
FROM scope
ON CONFLICT(key) DO NOTHING;

INSERT INTO customer_flow_versions
  (definition_id,version_no,status,config,effective_from,published_at)
SELECT
  d.id,
  1,
  'published',
  jsonb_build_object(
    'seedKey','construction-cost-estimator-v1',
    'headline','Plan your construction budget',
    'subheadline','Tell us about your project to get an indicative construction cost range.',
    'submitLabel','Calculate estimate',
    'resultTitle','Estimated construction project cost',
    'quoteCtaLabel','Get Actual Quotes',
    'estimatorDisclaimer','Indicative planning range only. Final pricing depends on drawings, structural design, soil and site conditions, approvals, specifications, brands, labour, taxes and professional quotation.'
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM customer_flow_definitions d
WHERE d.key='construction-cost-estimator'
  AND d.flow_type='estimator'
  AND NOT EXISTS (
    SELECT 1 FROM customer_flow_versions existing
    WHERE existing.definition_id=d.id
  );

INSERT INTO customer_flow_questions
  (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active)
SELECT v.id,x.question_key,x.question_type,x.label,x.help_text,x.is_required,x.display_order,
       x.validation::jsonb,x.show_when::jsonb,x.lead_field,x.visibility,TRUE
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
JOIN (VALUES
  ('project_location','location','Where is the construction project?','Enter the 6-digit PIN code for the site.',TRUE,10,'{}','{}',NULL,'internal'),
  ('project_type','single_select','What are you planning to build?','Choose the closest project type.',TRUE,20,'{}','{}','property_type','marketplace'),
  ('own_plot','boolean','Do you already own or control the plot?','This helps businesses understand project readiness.',TRUE,30,'{}','{}',NULL,'marketplace'),
  ('plot_area','area','What is the plot area?','Enter the approximate plot area in sq ft.',FALSE,40,'{"min":100,"max":1000000}','{}',NULL,'marketplace'),
  ('built_up_area','area','What is the planned built-up area?','Enter the total built-up construction area across all floors in sq ft.',TRUE,50,'{"min":200,"max":2000000}','{}',NULL,'marketplace'),
  ('floors','number','How many floors are planned?','Count the total floors included in the project.',TRUE,60,'{"min":1,"max":100}','{}',NULL,'marketplace'),
  ('construction_package','single_select','What construction package do you need?','Choose turnkey, civil/structure, or finishing-only work.',TRUE,70,'{}','{}',NULL,'marketplace'),
  ('quality','single_select','What specification level do you prefer?','This adjusts the range for materials, brands and finish expectations.',TRUE,80,'{}','{}',NULL,'marketplace'),
  ('basement','boolean','Does the project include a basement?','Basements generally add excavation, structure and waterproofing complexity.',TRUE,90,'{}','{}',NULL,'marketplace'),
  ('site_access','single_select','How is site access?','Restricted access can increase material handling and labour effort.',TRUE,100,'{}','{}',NULL,'marketplace'),
  ('timeline','timeline','When do you want to start?','Choose the closest expected construction start.',TRUE,110,'{}','{}',NULL,'marketplace'),
  ('additional_requirement','text','Anything else we should know?','Share structural, architectural, material or site requirements.',FALSE,120,'{"maxLength":1500}','{}',NULL,'protected')
) AS x(question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility)
  ON d.key='construction-cost-estimator'
 AND v.version_no=1
 AND v.config->>'seedKey'='construction-cost-estimator-v1'
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

WITH option_rows(question_key,value,label,display_order) AS (
  VALUES
    ('project_type','house','House / independent home',10),
    ('project_type','villa','Villa',20),
    ('project_type','commercial','Commercial building',30),
    ('project_type','extension','Building extension / additional floor',40),
    ('construction_package','turnkey','Turnkey construction',10),
    ('construction_package','structure_only','Civil / structure only',20),
    ('construction_package','finishing_only','Finishing work only',30),
    ('quality','standard','Standard',10),
    ('quality','premium','Premium',20),
    ('quality','luxury','Luxury',30),
    ('site_access','normal','Normal site access',10),
    ('site_access','restricted','Restricted / narrow access',20),
    ('timeline','immediately','Immediately',10),
    ('timeline','within_30_days','Within 30 days',20),
    ('timeline','one_to_three_months','1–3 months',30),
    ('timeline','three_to_six_months','3–6 months',40),
    ('timeline','later','Later / exploring',50)
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
SELECT q.id,o.value,o.label,o.display_order,TRUE
FROM option_rows o
JOIN customer_flow_definitions d ON d.key='construction-cost-estimator'
JOIN customer_flow_versions v ON v.definition_id=d.id
  AND v.version_no=1
  AND v.config->>'seedKey'='construction-cost-estimator-v1'
JOIN customer_flow_questions q ON q.version_id=v.id AND q.question_key=o.question_key
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

INSERT INTO estimator_rate_items
  (version_id,rate_key,label,calculation_type,unit_question_key,amount_min,amount_max,show_when,display_order,metadata,is_active)
SELECT v.id,x.rate_key,x.label,'per_unit','built_up_area',x.amount_min,x.amount_max,
       x.show_when::jsonb,x.display_order,'{"seed":"phase4-construction-v1"}'::jsonb,TRUE
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
JOIN (VALUES
  ('turnkey_base','Turnkey construction',1800.00::numeric,2300.00::numeric,'{"questionKey":"construction_package","equals":"turnkey"}',10),
  ('structure_base','Civil / structure construction',950.00::numeric,1300.00::numeric,'{"questionKey":"construction_package","equals":"structure_only"}',20),
  ('finishing_base','Finishing work',750.00::numeric,1150.00::numeric,'{"questionKey":"construction_package","equals":"finishing_only"}',30)
) AS x(rate_key,label,amount_min,amount_max,show_when,display_order)
  ON d.key='construction-cost-estimator'
 AND v.version_no=1
 AND v.config->>'seedKey'='construction-cost-estimator-v1'
ON CONFLICT(version_id,rate_key) DO UPDATE
SET label=EXCLUDED.label,
    calculation_type=EXCLUDED.calculation_type,
    unit_question_key=EXCLUDED.unit_question_key,
    amount_min=EXCLUDED.amount_min,
    amount_max=EXCLUDED.amount_max,
    show_when=EXCLUDED.show_when,
    display_order=EXCLUDED.display_order,
    metadata=EXCLUDED.metadata,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

INSERT INTO estimator_adjustments
  (version_id,adjustment_key,label,adjustment_type,value_min,value_max,city_id,show_when,display_order,metadata,is_active)
SELECT v.id,x.adjustment_key,x.label,'percent',x.value_min,x.value_max,x.city_id,x.show_when::jsonb,x.display_order,
       '{"seed":"phase4-construction-v1"}'::jsonb,TRUE
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
CROSS JOIN LATERAL (
  VALUES
    ('premium_spec','Premium specification',18.00::numeric,28.00::numeric,NULL::integer,'{"questionKey":"quality","equals":"premium"}',10),
    ('luxury_spec','Luxury specification',40.00::numeric,65.00::numeric,NULL::integer,'{"questionKey":"quality","equals":"luxury"}',20),
    ('commercial_complexity','Commercial project complexity',12.00::numeric,22.00::numeric,NULL::integer,'{"questionKey":"project_type","equals":"commercial"}',30),
    ('extension_complexity','Extension / additional-floor complexity',15.00::numeric,25.00::numeric,NULL::integer,'{"questionKey":"project_type","equals":"extension"}',40),
    ('basement_complexity','Basement complexity',12.00::numeric,20.00::numeric,NULL::integer,'{"questionKey":"basement","equals":true}',50),
    ('restricted_access','Restricted site access',5.00::numeric,10.00::numeric,NULL::integer,'{"questionKey":"site_access","equals":"restricted"}',60),
    ('hyderabad_market','Hyderabad market adjustment',2.00::numeric,6.00::numeric,(
       SELECT c.id
       FROM cities c
       JOIN states st ON st.id=c.state_id
       WHERE c.is_active=TRUE AND st.is_active=TRUE
         AND LOWER(c.name)='hyderabad'
         AND LOWER(st.name)='telangana'
       ORDER BY c.id
       LIMIT 1
     ),'{}',70)
) AS x(adjustment_key,label,value_min,value_max,city_id,show_when,display_order)
WHERE d.key='construction-cost-estimator'
  AND v.version_no=1
  AND v.config->>'seedKey'='construction-cost-estimator-v1'
  AND (x.adjustment_key<>'hyderabad_market' OR x.city_id IS NOT NULL)
ON CONFLICT(version_id,adjustment_key) DO UPDATE
SET label=EXCLUDED.label,
    adjustment_type=EXCLUDED.adjustment_type,
    value_min=EXCLUDED.value_min,
    value_max=EXCLUDED.value_max,
    city_id=EXCLUDED.city_id,
    show_when=EXCLUDED.show_when,
    display_order=EXCLUDED.display_order,
    metadata=EXCLUDED.metadata,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;
