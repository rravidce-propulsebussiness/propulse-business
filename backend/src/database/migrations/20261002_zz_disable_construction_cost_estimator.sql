-- Retire the legacy construction cost estimator.
-- Construction package selection now proceeds directly to the quote flow.
-- Keep historical estimator versions/data for auditability; only disable public use.

UPDATE customer_flow_definitions
SET is_active=FALSE,
    updated_at=CURRENT_TIMESTAMP
WHERE key='construction-cost-estimator';
