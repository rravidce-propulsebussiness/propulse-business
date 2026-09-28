-- Phase 3: first production estimator catalog.
-- This seeds a residential Interior Cost Estimator only when the definition has no versions.
-- All amounts are starter planning assumptions and remain editable/versioned in Admin.

WITH scope AS (
  SELECT i.id AS industry_id,
         s.id AS service_id,
         ss.id AS subservice_id
  FROM industries i
  JOIN services s ON s.industry_id=i.id AND s.is_active=TRUE
  LEFT JOIN subservices ss ON ss.service_id=s.id AND ss.is_active=TRUE
    AND (
      LOWER(COALESCE(ss.slug,''))='residential-interior-design'
      OR LOWER(ss.name)='residential interior design'
    )
  WHERE i.is_active=TRUE
    AND (
      LOWER(COALESCE(i.slug,'')) IN ('interior-design-home-improvement','interior-design','interiors','home-interiors')
      OR LOWER(i.name)='interior design & home improvement'
      OR LOWER(i.name)='interior design'
      OR LOWER(i.name) LIKE '%interior%'
    )
    AND (
      LOWER(COALESCE(s.slug,''))='interior-design'
      OR LOWER(s.name)='interior design'
      OR LOWER(s.name) LIKE '%interior%'
    )
  ORDER BY
    CASE WHEN LOWER(COALESCE(i.slug,''))='interior-design-home-improvement' THEN 0 ELSE 1 END,
    CASE WHEN LOWER(COALESCE(s.slug,''))='interior-design' THEN 0 ELSE 1 END,
    CASE WHEN LOWER(COALESCE(ss.slug,''))='residential-interior-design' THEN 0 ELSE 1 END,
    i.id,s.id,ss.id NULLS LAST
  LIMIT 1
)
INSERT INTO customer_flow_definitions
  (key,name,flow_type,industry_id,service_id,subservice_id,is_active)
SELECT
  'interior-cost-estimator',
  'Interior Cost Estimator',
  'estimator',
  industry_id,
  service_id,
  subservice_id,
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
    'seedKey','interior-cost-estimator-v1',
    'headline','Plan your interior budget',
    'subheadline','Tell us about your home and scope to get an indicative interior cost range.',
    'submitLabel','Calculate estimate',
    'resultTitle','Estimated interior project cost',
    'quoteCtaLabel','Get Actual Quotes',
    'estimatorDisclaimer','Indicative planning range only. Final pricing depends on site measurements, design, materials, brands, hardware, civil changes, taxes and professional quotation.'
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM customer_flow_definitions d
WHERE d.key='interior-cost-estimator'
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
  ('project_location','location','Where is your home?','Enter the 6-digit PIN code for the project location.',TRUE,10,'{}','{}',NULL,'internal'),
  ('property_type','single_select','What type of home is it?','Choose the closest residential property type.',TRUE,20,'{}','{}','property_type','marketplace'),
  ('bhk','single_select','What is the home configuration?','Choose the closest BHK size.',TRUE,30,'{}','{}',NULL,'marketplace'),
  ('area','area','What is the approximate interior area?','Enter the carpet or built-up area you want to plan, in sq ft.',TRUE,40,'{"min":200,"max":50000}','{}',NULL,'marketplace'),
  ('property_status','single_select','Is it a new or existing home?','Existing homes can require dismantling, repair or additional site work.',TRUE,50,'{}','{}',NULL,'marketplace'),
  ('scope_mode','single_select','How much interior work do you need?','Choose full-home interiors or estimate selected work only.',TRUE,60,'{}','{}',NULL,'marketplace'),
  ('selected_work','multi_select','Which work should we estimate?','Select every item you want included.',TRUE,70,'{"minItems":1,"maxItems":6}','{"questionKey":"scope_mode","equals":"selected_work"}',NULL,'marketplace'),
  ('kitchen_package','single_select','What kind of modular kitchen do you need?','Choose an indicative kitchen scope.',TRUE,80,'{}','{"questionKey":"selected_work","equals":"kitchen"}',NULL,'marketplace'),
  ('wardrobe_units','number','How many wardrobe units do you need?','Count the major wardrobe units to be planned.',TRUE,90,'{"min":1,"max":20}','{"questionKey":"selected_work","equals":"wardrobes"}',NULL,'marketplace'),
  ('false_ceiling_area','area','Approximate false-ceiling area','Enter the area in sq ft that needs a false ceiling.',TRUE,100,'{"min":50,"max":50000}','{"questionKey":"selected_work","equals":"false_ceiling"}',NULL,'marketplace'),
  ('furniture_package','single_select','What furniture scope do you need?','Choose the closest package for loose and fixed furniture.',TRUE,110,'{}','{"questionKey":"selected_work","equals":"furniture"}',NULL,'marketplace'),
  ('finish_quality','single_select','What finish level do you prefer?','This adjusts the estimate for material, hardware and finish expectations.',TRUE,120,'{}','{}',NULL,'marketplace'),
  ('timeline','timeline','When do you want to start?','Choose the closest expected start timeline.',TRUE,130,'{}','{}',NULL,'marketplace'),
  ('additional_requirement','text','Anything else we should know?','Share room, style, material or site preferences.',FALSE,140,'{"maxLength":1500}','{}',NULL,'protected')
) AS x(question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility)
  ON d.key='interior-cost-estimator'
 AND v.version_no=1
 AND v.config->>'seedKey'='interior-cost-estimator-v1'
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
    ('property_type','apartment','Apartment',10),
    ('property_type','villa','Villa',20),
    ('property_type','independent_house','Independent house',30),
    ('bhk','1bhk','1 BHK',10),
    ('bhk','2bhk','2 BHK',20),
    ('bhk','3bhk','3 BHK',30),
    ('bhk','4bhk','4 BHK',40),
    ('bhk','5plus','5+ BHK',50),
    ('property_status','new_property','New home',10),
    ('property_status','existing_property','Existing / renovation home',20),
    ('scope_mode','full_home','Full-home interiors',10),
    ('scope_mode','selected_work','Selected work only',20),
    ('selected_work','kitchen','Modular kitchen',10),
    ('selected_work','wardrobes','Wardrobes',20),
    ('selected_work','false_ceiling','False ceiling',30),
    ('selected_work','furniture','Furniture',40),
    ('selected_work','painting','Painting / wall finish',50),
    ('selected_work','lighting','Lighting',60),
    ('kitchen_package','compact','Compact modular kitchen',10),
    ('kitchen_package','full','Full modular kitchen',20),
    ('furniture_package','essential','Essential furniture',10),
    ('furniture_package','full','Full furniture package',20),
    ('finish_quality','standard','Standard',10),
    ('finish_quality','premium','Premium',20),
    ('finish_quality','luxury','Luxury',30),
    ('timeline','immediately','Immediately',10),
    ('timeline','within_30_days','Within 30 days',20),
    ('timeline','one_to_three_months','1–3 months',30),
    ('timeline','three_to_six_months','3–6 months',40),
    ('timeline','later','Later / exploring',50)
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
SELECT q.id,o.value,o.label,o.display_order,TRUE
FROM option_rows o
JOIN customer_flow_definitions d ON d.key='interior-cost-estimator'
JOIN customer_flow_versions v ON v.definition_id=d.id
  AND v.version_no=1
  AND v.config->>'seedKey'='interior-cost-estimator-v1'
JOIN customer_flow_questions q ON q.version_id=v.id AND q.question_key=o.question_key
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

INSERT INTO estimator_rate_items
  (version_id,rate_key,label,calculation_type,unit_question_key,amount_min,amount_max,show_when,display_order,metadata,is_active)
SELECT v.id,x.rate_key,x.label,x.calculation_type,x.unit_question_key,x.amount_min,x.amount_max,
       x.show_when::jsonb,x.display_order,'{"seed":"phase3-interior-v1"}'::jsonb,TRUE
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
JOIN (VALUES
  ('full_home_base','Full-home interior base','per_unit','area',1100.00::numeric,1500.00::numeric,'{"questionKey":"scope_mode","equals":"full_home"}',10),
  ('kitchen_compact','Compact modular kitchen','fixed',NULL,120000.00::numeric,220000.00::numeric,'{"questionKey":"kitchen_package","equals":"compact"}',20),
  ('kitchen_full','Full modular kitchen','fixed',NULL,200000.00::numeric,380000.00::numeric,'{"questionKey":"kitchen_package","equals":"full"}',30),
  ('wardrobe_units','Wardrobes','per_unit','wardrobe_units',35000.00::numeric,65000.00::numeric,'{"questionKey":"selected_work","equals":"wardrobes"}',40),
  ('false_ceiling','False ceiling','per_unit','false_ceiling_area',90.00::numeric,150.00::numeric,'{"questionKey":"selected_work","equals":"false_ceiling"}',50),
  ('furniture_essential','Essential furniture','fixed',NULL,120000.00::numeric,250000.00::numeric,'{"questionKey":"furniture_package","equals":"essential"}',60),
  ('furniture_full','Full furniture package','fixed',NULL,250000.00::numeric,600000.00::numeric,'{"questionKey":"furniture_package","equals":"full"}',70),
  ('painting','Painting / wall finish','fixed',NULL,50000.00::numeric,120000.00::numeric,'{"questionKey":"selected_work","equals":"painting"}',80),
  ('lighting','Lighting package','fixed',NULL,50000.00::numeric,150000.00::numeric,'{"questionKey":"selected_work","equals":"lighting"}',90)
) AS x(rate_key,label,calculation_type,unit_question_key,amount_min,amount_max,show_when,display_order)
  ON d.key='interior-cost-estimator'
 AND v.version_no=1
 AND v.config->>'seedKey'='interior-cost-estimator-v1'
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
       '{"seed":"phase3-interior-v1"}'::jsonb,TRUE
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
CROSS JOIN LATERAL (
  VALUES
    ('premium_finish','Premium finish',25.00::numeric,35.00::numeric,NULL::integer,'{"questionKey":"finish_quality","equals":"premium"}',10),
    ('luxury_finish','Luxury finish',60.00::numeric,90.00::numeric,NULL::integer,'{"questionKey":"finish_quality","equals":"luxury"}',20),
    ('existing_home','Existing-home site work',10.00::numeric,20.00::numeric,NULL::integer,'{"questionKey":"property_status","equals":"existing_property"}',30),
    ('villa_scope','Villa complexity',10.00::numeric,20.00::numeric,NULL::integer,'{"questionKey":"property_type","equals":"villa"}',40),
    ('independent_house_scope','Independent-house complexity',5.00::numeric,15.00::numeric,NULL::integer,'{"questionKey":"property_type","equals":"independent_house"}',50),
    ('hyderabad_market','Hyderabad market adjustment',3.00::numeric,7.00::numeric,(
       SELECT c.id
       FROM cities c
       JOIN states st ON st.id=c.state_id
       WHERE c.is_active=TRUE AND st.is_active=TRUE
         AND LOWER(c.name)='hyderabad'
         AND LOWER(st.name)='telangana'
       ORDER BY c.id
       LIMIT 1
     ),'{}',60)
) AS x(adjustment_key,label,value_min,value_max,city_id,show_when,display_order)
WHERE d.key='interior-cost-estimator'
  AND v.version_no=1
  AND v.config->>'seedKey'='interior-cost-estimator-v1'
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
