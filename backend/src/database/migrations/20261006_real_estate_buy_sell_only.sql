-- Keep the published Real Estate customer flow aligned with the public Buy/Sell-only product scope.
WITH target AS (
  SELECT v.id AS version_id
  FROM customer_flow_definitions d
  JOIN customer_flow_versions v ON v.definition_id=d.id
  WHERE d.key='property' AND v.status='published'
  ORDER BY v.version_no DESC
  LIMIT 1
),
intent_question AS (
  SELECT q.id AS question_id
  FROM customer_flow_questions q
  JOIN target t ON t.version_id=q.version_id
  WHERE q.question_key='property_intent'
)
UPDATE customer_flow_question_options o
SET is_active=CASE WHEN o.value IN ('buy','sell') THEN TRUE ELSE FALSE END,
    updated_at=CURRENT_TIMESTAMP
FROM intent_question q
WHERE o.question_id=q.question_id
  AND o.value IN ('buy','sell','rent','invest');

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
