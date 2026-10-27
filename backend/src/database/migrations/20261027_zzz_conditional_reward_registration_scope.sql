-- Restrict conditional lead rewards to future registrations when selected.
-- Existing campaigns with a project-upload signup window historically only
-- rewarded companies registered after campaign creation. Preserve that behavior.
ALTER TABLE lead_entitlement_business_campaigns
  ADD COLUMN IF NOT EXISTS registration_scope VARCHAR(24) NOT NULL DEFAULT 'any';

UPDATE lead_entitlement_business_campaigns
SET registration_scope='new_registration'
WHERE project_registration_window_days>0 AND registration_scope='any';

ALTER TABLE lead_entitlement_business_campaigns
  DROP CONSTRAINT IF EXISTS lead_entitlement_business_campaigns_registration_scope_check;
ALTER TABLE lead_entitlement_business_campaigns
  ADD CONSTRAINT lead_entitlement_business_campaigns_registration_scope_check
  CHECK (registration_scope IN ('any','new_registration'));
