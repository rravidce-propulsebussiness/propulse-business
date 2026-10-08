-- Professional service packages must identify their quotation industry.
-- Legacy records remain unclassified until the professional explicitly assigns an industry.
ALTER TABLE business_profile_service_plans
  ADD COLUMN IF NOT EXISTS industry TEXT;

CREATE INDEX IF NOT EXISTS idx_business_profile_service_plans_industry
  ON business_profile_service_plans (business_profile_id, industry)
  WHERE is_published = TRUE;
