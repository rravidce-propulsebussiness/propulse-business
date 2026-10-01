-- Construction plot area is collected in square yards.
-- Built-up area remains square feet because construction pricing is per sq ft.

UPDATE customer_flow_questions q
SET help_text='Enter the approximate plot area in sq yards.',
    validation='{"min":10,"max":100000}'::jsonb,
    updated_at=CURRENT_TIMESTAMP
FROM customer_flow_versions v
JOIN customer_flow_definitions d ON d.id=v.definition_id
WHERE q.version_id=v.id
  AND q.question_key='plot_area'
  AND q.question_type='area'
  AND d.key IN ('build','construction-cost-estimator')
  AND v.status IN ('published','draft');
