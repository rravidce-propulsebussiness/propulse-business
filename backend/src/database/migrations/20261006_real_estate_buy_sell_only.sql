-- Keep the published Real Estate flow Buy/Sell-only even if older seeds contain Rent/Invest.
WITH property_intent_question AS (
  SELECT q.id
    FROM customer_flow_definitions d
    JOIN customer_flow_versions v ON v.definition_id=d.id AND v.status='published'
    JOIN customer_flow_questions q ON q.version_id=v.id
   WHERE d.key='property'
     AND q.question_key='property_intent'
     AND q.is_active=TRUE
   ORDER BY v.version_no DESC,q.id DESC
   LIMIT 1
),
allowed(value,label,display_order) AS (
  VALUES
    ('buy','Buy a property',10),
    ('sell','Sell a property',20)
)
INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active)
SELECT q.id,a.value,a.label,a.display_order,TRUE
  FROM property_intent_question q
 CROSS JOIN allowed a
ON CONFLICT(question_id,value) DO UPDATE
SET label=EXCLUDED.label,
    display_order=EXCLUDED.display_order,
    is_active=TRUE,
    updated_at=CURRENT_TIMESTAMP;

WITH property_intent_question AS (
  SELECT q.id
    FROM customer_flow_definitions d
    JOIN customer_flow_versions v ON v.definition_id=d.id AND v.status='published'
    JOIN customer_flow_questions q ON q.version_id=v.id
   WHERE d.key='property'
     AND q.question_key='property_intent'
     AND q.is_active=TRUE
   ORDER BY v.version_no DESC,q.id DESC
   LIMIT 1
)
UPDATE customer_flow_question_options o
   SET is_active=FALSE,
       updated_at=CURRENT_TIMESTAMP
  FROM property_intent_question q
 WHERE o.question_id=q.id
   AND o.value NOT IN ('buy','sell');

UPDATE customer_flow_versions v
SET config=jsonb_set(
      COALESCE(v.config,'{}'::jsonb),
      '{subheadline}',
      to_jsonb('Share your location, property type, budget and timeline for a Buy or Sell requirement.'::text),
      true
    ),
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_definitions d
WHERE d.id=v.definition_id
  AND d.key='property'
  AND v.status='published'
  AND v.version_no=(
    SELECT MAX(v2.version_no)
    FROM customer_flow_versions v2
    WHERE v2.definition_id=d.id AND v2.status='published'
  );
