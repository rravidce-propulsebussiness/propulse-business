-- Customer funnel analytics support indexes.
-- No new analytics data store is introduced; reporting reads canonical estimator/lead tables.

CREATE INDEX IF NOT EXISTS idx_estimator_calculations_created
  ON estimator_calculations(created_at DESC,id DESC);

CREATE INDEX IF NOT EXISTS idx_estimator_calculations_conversion_created
  ON estimator_calculations(converted_at,created_at DESC)
  WHERE converted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_public_funnel_created
  ON leads(source,created_at DESC,id DESC)
  WHERE source IN ('public_requirement','public_estimator');
