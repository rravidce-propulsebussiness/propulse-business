-- Retire the legacy interior cost estimator.
-- Interior package selection now proceeds through the packages/quote journey.
-- Keep historical estimator versions/calculations for auditability.

UPDATE customer_flow_definitions
SET is_active=FALSE,
    updated_at=CURRENT_TIMESTAMP
WHERE key='interior-cost-estimator';
