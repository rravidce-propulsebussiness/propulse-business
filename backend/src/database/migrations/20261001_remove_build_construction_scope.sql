-- Construction work-scope selection was removed from the public build intake.
-- Project type + quality + budget + timeline now keep the lead form shorter.

UPDATE customer_flow_questions q
SET is_required=FALSE,
    is_active=FALSE,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='build'
  AND v.status IN ('published','draft')
  AND q.question_key='construction_scope';
