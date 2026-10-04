-- Align the public construction quote terminology with the package page.
-- Keep the stable option value "luxury" for compatibility with existing calculations,
-- but present it to homeowners as the Royal package tier.

UPDATE customer_flow_question_options o
SET label='Royal', updated_at=CURRENT_TIMESTAMP
FROM customer_flow_questions q
JOIN customer_flow_versions v ON v.id=q.version_id
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE o.question_id=q.id
  AND q.question_key='quality'
  AND o.value='luxury'
  AND d.key IN ('build','construction-cost-estimator');

UPDATE customer_flow_questions q
SET help_text='Choose Standard, Premium or Royal as the preferred package/specification level.',
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND q.question_key='quality'
  AND d.key IN ('build','construction-cost-estimator');
