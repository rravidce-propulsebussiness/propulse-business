-- Phase 1 compatibility seed for existing Propulse databases.
-- Replays the idempotent starter flow seed with flexible taxonomy matching.
-- It never creates or duplicates industries/services; service scope may fall back to the matched industry.

WITH industry_scope AS (
  SELECT i.id
  FROM industries i
  WHERE i.is_active=TRUE
    AND (
      LOWER(COALESCE(i.slug,'')) IN ('construction','construction-services','civil-construction')
      OR LOWER(i.name)='construction'
      OR LOWER(i.name) LIKE '%construction%'
    )
  ORDER BY
    CASE
      WHEN LOWER(COALESCE(i.slug,''))='construction' THEN 0
      WHEN LOWER(i.name)='construction' THEN 1
      ELSE 2
    END,
    i.id
  LIMIT 1
),
scope AS (
  SELECT i.id AS industry_id,
         (
           SELECT s.id
           FROM services s
           WHERE s.industry_id=i.id
             AND s.is_active=TRUE
             AND (
               LOWER(COALESCE(s.slug,'')) IN ('building-contractors','civil-construction','house-construction','construction')
               OR LOWER(s.name) IN ('building contractors','civil construction','house construction','construction')
               OR LOWER(s.name) LIKE '%building%contract%'
               OR LOWER(s.name) LIKE '%construction%'
             )
           ORDER BY
             CASE
               WHEN LOWER(COALESCE(s.slug,''))='building-contractors' THEN 0
               WHEN LOWER(s.name)='building contractors' THEN 1
               WHEN LOWER(COALESCE(s.slug,''))='civil-construction' THEN 2
               ELSE 3
             END,
             s.id
           LIMIT 1
         ) AS service_id
  FROM industry_scope i
)
INSERT INTO customer_flow_definitions(key,name,flow_type,industry_id,service_id,is_active)
SELECT 'build','Build / Construction Requirement','requirement',industry_id,service_id,TRUE FROM scope
ON CONFLICT(key) DO UPDATE
SET name=EXCLUDED.name,
    industry_id=EXCLUDED.industry_id,
    service_id=EXCLUDED.service_id,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

WITH industry_scope AS (
  SELECT i.id
  FROM industries i
  WHERE i.is_active=TRUE
    AND (
      LOWER(COALESCE(i.slug,'')) IN ('interior-design-home-improvement','interior-design','interiors','home-interiors')
      OR LOWER(i.name)='interior design & home improvement'
      OR LOWER(i.name)='interior design'
      OR LOWER(i.name) LIKE '%interior%'
    )
  ORDER BY
    CASE
      WHEN LOWER(COALESCE(i.slug,''))='interior-design-home-improvement' THEN 0
      WHEN LOWER(i.name)='interior design & home improvement' THEN 1
      WHEN LOWER(COALESCE(i.slug,''))='interior-design' THEN 2
      ELSE 3
    END,
    i.id
  LIMIT 1
),
scope AS (
  SELECT i.id AS industry_id,
         (
           SELECT s.id
           FROM services s
           WHERE s.industry_id=i.id
             AND s.is_active=TRUE
             AND (
               LOWER(COALESCE(s.slug,'')) IN ('interior-design','home-interiors','interiors','home-renovation')
               OR LOWER(s.name) IN ('interior design','home interiors','interiors','home renovation')
               OR LOWER(s.name) LIKE '%interior%'
             )
           ORDER BY
             CASE
               WHEN LOWER(COALESCE(s.slug,''))='interior-design' THEN 0
               WHEN LOWER(s.name)='interior design' THEN 1
               ELSE 2
             END,
             s.id
           LIMIT 1
         ) AS service_id
  FROM industry_scope i
)
INSERT INTO customer_flow_definitions(key,name,flow_type,industry_id,service_id,is_active)
SELECT 'design','Interior Design Requirement','requirement',industry_id,service_id,TRUE FROM scope
ON CONFLICT(key) DO UPDATE
SET name=EXCLUDED.name,
    industry_id=EXCLUDED.industry_id,
    service_id=EXCLUDED.service_id,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

INSERT INTO customer_flow_versions(definition_id,version_no,status,config,effective_from,published_at)
SELECT d.id,1,'published',
       jsonb_build_object(
         'headline','Tell us what you need',
         'subheadline','A few details help us match your requirement with relevant businesses.',
         'submitLabel','Get Quotes'
       ),
       CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM customer_flow_definitions d
WHERE d.key IN ('build','design')
ON CONFLICT(definition_id,version_no) DO NOTHING;

INSERT INTO customer_flow_questions
  (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility)
SELECT v.id,x.question_key,x.question_type,x.label,x.help_text,x.is_required,x.display_order,
       x.validation::jsonb,x.show_when::jsonb,x.lead_field,x.visibility
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
JOIN (VALUES
  ('project_type','single_select','What are you planning?','Choose the project that best matches your requirement.',TRUE,10,'{}','{}',NULL,'marketplace'),
  ('own_plot','boolean','Do you own the plot?','This helps businesses understand project readiness.',TRUE,20,'{}','{}',NULL,'marketplace'),
  ('project_location','location','Where is the project?','Enter the 6-digit PIN code for the project location.',TRUE,30,'{}','{}',NULL,'internal'),
  ('plot_area','area','What is the plot area?','Enter the approximate area in sq ft.',TRUE,40,'{"min":50,"max":1000000}','{}',NULL,'marketplace'),
  ('built_up_area','area','Built-up area, if known','You can skip this if it is not decided yet.',FALSE,50,'{"min":50,"max":2000000}','{}',NULL,'marketplace'),
  ('floors','number','How many floors are planned?','Count the total planned floors.',TRUE,60,'{"min":1,"max":100}','{}',NULL,'marketplace'),
  ('property_type','single_select','Is the project residential or commercial?','Choose the primary use.',TRUE,70,'{}','{}','property_type','marketplace'),
  ('construction_scope','multi_select','What work do you need?','Select all major work included in the requirement.',TRUE,80,'{"minItems":1,"maxItems":8}','{}',NULL,'marketplace'),
  ('quality','single_select','What quality level do you prefer?','This is a preference, not a final quotation.',TRUE,90,'{}','{}',NULL,'marketplace'),
  ('budget','budget','What is your approximate budget?','An approximate range helps businesses respond appropriately.',FALSE,100,'{"maxLength":100}','{}','budget','marketplace'),
  ('timeline','timeline','When do you want to start?','Choose the closest expected timeline.',TRUE,110,'{}','{}',NULL,'marketplace'),
  ('additional_requirement','text','Anything else we should know?','Share important project details or preferences.',FALSE,120,'{"maxLength":1500}','{}','requirement','protected')
) AS x(question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility)
  ON d.key='build' AND v.version_no=1
ON CONFLICT(version_id,question_key) DO UPDATE
SET question_type=EXCLUDED.question_type,label=EXCLUDED.label,help_text=EXCLUDED.help_text,
    is_required=EXCLUDED.is_required,display_order=EXCLUDED.display_order,
    validation=EXCLUDED.validation,show_when=EXCLUDED.show_when,
    lead_field=EXCLUDED.lead_field,visibility=EXCLUDED.visibility,is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

INSERT INTO customer_flow_questions
  (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility)
SELECT v.id,x.question_key,x.question_type,x.label,x.help_text,x.is_required,x.display_order,
       x.validation::jsonb,x.show_when::jsonb,x.lead_field,x.visibility
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
JOIN (VALUES
  ('project_location','location','Where is the property?','Enter the 6-digit PIN code for the property.',TRUE,10,'{}','{}',NULL,'internal'),
  ('property_type','single_select','What type of property is it?','Choose the closest property type.',TRUE,20,'{}','{}','property_type','marketplace'),
  ('bhk','single_select','What is the home size?','Choose the closest BHK configuration.',FALSE,30,'{}','{"questionKey":"property_type","in":["apartment","villa","independent_house"]}',NULL,'marketplace'),
  ('area','area','What is the approximate area?','Enter carpet or built-up area in sq ft.',FALSE,40,'{"min":50,"max":1000000}','{}',NULL,'marketplace'),
  ('property_status','single_select','Is this a new or existing property?','This helps identify the right interior scope.',TRUE,50,'{}','{}',NULL,'marketplace'),
  ('possession_status','single_select','What is the possession status?','Tell us whether the property is already available for work.',FALSE,60,'{}','{"questionKey":"property_status","equals":"new_property"}',NULL,'marketplace'),
  ('interior_scope','multi_select','What interior work do you need?','Select all relevant areas.',TRUE,70,'{"minItems":1,"maxItems":10}','{}',NULL,'marketplace'),
  ('kitchen','single_select','Do you need a modular kitchen?','Choose the closest requirement.',FALSE,80,'{}','{}',NULL,'marketplace'),
  ('wardrobes','single_select','Do you need wardrobes?','Choose the closest requirement.',FALSE,90,'{}','{}',NULL,'marketplace'),
  ('false_ceiling','boolean','Do you need a false ceiling?','This can be changed later during detailed discussion.',FALSE,100,'{}','{}',NULL,'marketplace'),
  ('furniture','boolean','Do you need furniture work?','Select yes if loose or fixed furniture is part of the scope.',FALSE,110,'{}','{}',NULL,'marketplace'),
  ('finish_quality','single_select','What finish level do you prefer?','Choose an indicative preference.',TRUE,120,'{}','{}',NULL,'marketplace'),
  ('budget','budget','What is your approximate budget?','A range is enough.',FALSE,130,'{"maxLength":100}','{}','budget','marketplace'),
  ('timeline','timeline','When do you want to start?','Choose the closest expected start timeline.',TRUE,140,'{}','{}',NULL,'marketplace'),
  ('additional_requirement','text','Anything else we should know?','Share important room, style or site details.',FALSE,150,'{"maxLength":1500}','{}','requirement','protected')
) AS x(question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility)
  ON d.key='design' AND v.version_no=1
ON CONFLICT(version_id,question_key) DO UPDATE
SET question_type=EXCLUDED.question_type,label=EXCLUDED.label,help_text=EXCLUDED.help_text,
    is_required=EXCLUDED.is_required,display_order=EXCLUDED.display_order,
    validation=EXCLUDED.validation,show_when=EXCLUDED.show_when,
    lead_field=EXCLUDED.lead_field,visibility=EXCLUDED.visibility,is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

WITH option_rows(flow_key,question_key,value,label,display_order) AS (
  VALUES
    ('build','project_type','house_construction','House construction',10),
    ('build','project_type','commercial_building','Commercial building',20),
    ('build','project_type','building_extension','Building extension',30),
    ('build','property_type','residential','Residential',10),
    ('build','property_type','commercial','Commercial',20),
    ('build','construction_scope','turnkey','Turnkey construction',10),
    ('build','construction_scope','civil_structure','Civil / structure',20),
    ('build','construction_scope','finishing','Finishing work',30),
    ('build','construction_scope','electrical','Electrical',40),
    ('build','construction_scope','plumbing','Plumbing',50),
    ('build','construction_scope','waterproofing','Waterproofing',60),
    ('build','quality','standard','Standard',10),
    ('build','quality','premium','Premium',20),
    ('build','quality','luxury','Luxury',30),
    ('build','timeline','immediately','Immediately',10),
    ('build','timeline','within_30_days','Within 30 days',20),
    ('build','timeline','one_to_three_months','1–3 months',30),
    ('build','timeline','three_to_six_months','3–6 months',40),
    ('build','timeline','later','Later / exploring',50),

    ('design','property_type','apartment','Apartment',10),
    ('design','property_type','villa','Villa',20),
    ('design','property_type','independent_house','Independent house',30),
    ('design','property_type','office','Office',40),
    ('design','property_type','commercial_space','Commercial space',50),
    ('design','bhk','1bhk','1 BHK',10),
    ('design','bhk','2bhk','2 BHK',20),
    ('design','bhk','3bhk','3 BHK',30),
    ('design','bhk','4bhk','4 BHK',40),
    ('design','bhk','5plus','5+ BHK',50),
    ('design','property_status','new_property','New property',10),
    ('design','property_status','existing_property','Existing property',20),
    ('design','possession_status','received','Possession received',10),
    ('design','possession_status','within_30_days','Within 30 days',20),
    ('design','possession_status','one_to_three_months','1–3 months',30),
    ('design','possession_status','later','Later',40),
    ('design','interior_scope','full_home','Full home interior',10),
    ('design','interior_scope','kitchen','Modular kitchen',20),
    ('design','interior_scope','wardrobes','Wardrobes',30),
    ('design','interior_scope','false_ceiling','False ceiling',40),
    ('design','interior_scope','furniture','Furniture',50),
    ('design','interior_scope','painting','Painting / wall finish',60),
    ('design','interior_scope','lighting','Lighting',70),
    ('design','kitchen','yes','Yes',10),
    ('design','kitchen','no','No',20),
    ('design','kitchen','not_sure','Not sure',30),
    ('design','wardrobes','yes','Yes',10),
    ('design','wardrobes','no','No',20),
    ('design','wardrobes','not_sure','Not sure',30),
    ('design','finish_quality','standard','Standard',10),
    ('design','finish_quality','premium','Premium',20),
    ('design','finish_quality','luxury','Luxury',30),
    ('design','timeline','immediately','Immediately',10),
    ('design','timeline','within_30_days','Within 30 days',20),
    ('design','timeline','one_to_three_months','1–3 months',30),
    ('design','timeline','three_to_six_months','3–6 months',40),
    ('design','timeline','later','Later / exploring',50)
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order)
SELECT q.id,o.value,o.label,o.display_order
FROM option_rows o
JOIN customer_flow_definitions d ON d.key=o.flow_key
JOIN customer_flow_versions v ON v.definition_id=d.id AND v.version_no=1
JOIN customer_flow_questions q ON q.version_id=v.id AND q.question_key=o.question_key
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,display_order=EXCLUDED.display_order,is_active=TRUE,updated_at=CURRENT_TIMESTAMP;
