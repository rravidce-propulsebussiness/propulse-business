-- ProPulse no longer exposes estimator customer flows. Quotation/requirement flows are canonical.
DELETE FROM customer_flow_definitions
WHERE flow_type='estimator'
  AND key IN ('construction-cost-estimator','interior-cost-estimator');
