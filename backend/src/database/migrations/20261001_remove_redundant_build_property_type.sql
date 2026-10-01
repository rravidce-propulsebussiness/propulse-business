-- The build flow now captures Residential / Commercial / Renovation / Extension
-- in project_type, so the separate residential-vs-commercial question is redundant.

UPDATE customer_flow_questions q
SET is_active=FALSE,
    is_required=FALSE,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND d.key='build'
  AND v.status IN ('published','draft')
  AND q.question_key='property_type';
