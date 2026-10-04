-- Simplify the public interior-design requirement flow.
-- Area and room/scope selection are no longer collected in this lead form.

UPDATE customer_flow_questions q
SET is_required=FALSE,
    is_active=FALSE,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='design'
  AND v.status IN ('published','draft')
  AND q.question_key IN ('area','rooms','interior_scope');
