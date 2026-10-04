-- Public customer acquisition flow for Real Estate.
-- Reuses the existing taxonomy and creates no new industries or services.

WITH industry_scope AS (
  SELECT i.id
  FROM industries i
  WHERE i.is_active=TRUE
    AND (
      LOWER(COALESCE(i.slug,'')) IN ('real-estate','realestate','property','properties')
      OR LOWER(i.name)='real estate'
      OR LOWER(i.name) LIKE '%real estate%'
      OR LOWER(i.name) LIKE '%property%'
    )
  ORDER BY
    CASE
      WHEN LOWER(COALESCE(i.slug,''))='real-estate' THEN 0
      WHEN LOWER(i.name)='real estate' THEN 1
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
               LOWER(COALESCE(s.slug,'')) IN ('real-estate','property-buying','property-services','residential-property')
               OR LOWER(s.name) IN ('real estate','property buying','property services','residential property')
               OR LOWER(s.name) LIKE '%property%'
               OR LOWER(s.name) LIKE '%real estate%'
             )
           ORDER BY
             CASE
               WHEN LOWER(COALESCE(s.slug,''))='real-estate' THEN 0
               WHEN LOWER(s.name)='real estate' THEN 1
               ELSE 2
             END,
             s.id
           LIMIT 1
         ) AS service_id
  FROM industry_scope i
)
INSERT INTO customer_flow_definitions(key,name,flow_type,industry_id,service_id,is_active)
SELECT 'property','Real Estate Requirement','requirement',industry_id,service_id,TRUE
FROM scope
WHERE industry_id IS NOT NULL
ON CONFLICT(key) DO UPDATE
SET name=EXCLUDED.name,
    industry_id=EXCLUDED.industry_id,
    service_id=EXCLUDED.service_id,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

INSERT INTO customer_flow_versions(definition_id,version_no,status,config,effective_from,published_at)
SELECT d.id,1,'published',
       jsonb_build_object(
         'headline','Tell us what property you need',
         'subheadline','Share your location, property type, budget and timeline so relevant real estate businesses can respond.',
         'submitLabel','Get Property Options'
       ),
       CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM customer_flow_definitions d
WHERE d.key='property'
ON CONFLICT(definition_id,version_no) DO UPDATE
SET status='published',
    config=EXCLUDED.config,
    effective_from=COALESCE(customer_flow_versions.effective_from,CURRENT_TIMESTAMP),
    published_at=COALESCE(customer_flow_versions.published_at,CURRENT_TIMESTAMP),
    updated_at=CURRENT_TIMESTAMP;

INSERT INTO customer_flow_questions
  (version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility)
SELECT v.id,x.question_key,x.question_type,x.label,x.help_text,x.is_required,x.display_order,
       x.validation::jsonb,x.show_when::jsonb,x.lead_field,x.visibility
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
JOIN (VALUES
  ('property_intent','single_select','What do you want to do?','Choose the option that best matches your requirement.',TRUE,10,'{}','{}',NULL,'marketplace'),
  ('project_location','location','Where are you looking?','Enter the 6-digit PIN code for the preferred property location.',TRUE,20,'{}','{}',NULL,'internal'),
  ('property_type','single_select','What type of property do you need?','Choose the closest property type.',TRUE,30,'{}','{}','property_type','marketplace'),
  ('bhk','single_select','What home size do you prefer?','Choose the closest BHK configuration.',FALSE,40,'{}','{"questionKey":"property_type","in":["apartment","villa","independent_house"]}',NULL,'marketplace'),
  ('budget','budget','What is your approximate budget?','A budget range helps businesses share more relevant options.',FALSE,50,'{"maxLength":100}','{}','budget','marketplace'),
  ('timeline','timeline','When do you want to move forward?','Choose the closest expected timeline.',TRUE,60,'{}','{}',NULL,'marketplace'),
  ('additional_requirement','text','Anything else we should know?','Share preferred locality, size, amenities or other important details.',FALSE,70,'{"maxLength":1500}','{}','requirement','protected')
) AS x(question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility)
  ON d.key='property' AND v.version_no=1
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
    ('property_intent','buy','Buy a property',10),
    ('property_intent','rent','Rent a property',20),
    ('property_intent','sell','Sell a property',30),
    ('property_intent','invest','Invest in property',40),

    ('property_type','apartment','Apartment',10),
    ('property_type','villa','Villa',20),
    ('property_type','independent_house','Independent house',30),
    ('property_type','plot','Plot / land',40),
    ('property_type','commercial','Commercial property',50),
    ('property_type','office','Office space',60),

    ('bhk','1bhk','1 BHK',10),
    ('bhk','2bhk','2 BHK',20),
    ('bhk','3bhk','3 BHK',30),
    ('bhk','4bhk','4 BHK',40),
    ('bhk','5plus','5+ BHK',50),

    ('timeline','immediately','Immediately',10),
    ('timeline','within_30_days','Within 30 days',20),
    ('timeline','one_to_three_months','1–3 months',30),
    ('timeline','three_to_six_months','3–6 months',40),
    ('timeline','later','Later / exploring',50)
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order)
SELECT q.id,o.value,o.label,o.display_order
FROM option_rows o
JOIN customer_flow_definitions d ON d.key='property'
JOIN customer_flow_versions v ON v.definition_id=d.id AND v.version_no=1
JOIN customer_flow_questions q ON q.version_id=v.id AND q.question_key=o.question_key
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;
