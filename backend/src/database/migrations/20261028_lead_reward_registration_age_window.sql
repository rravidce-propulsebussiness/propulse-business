-- Conditional lead rewards can require qualification within N days after
-- account registration, independently of project upload and credit expiry.
-- Existing campaigns keep unlimited signup-age eligibility until configured.
ALTER TABLE lead_entitlement_business_campaigns
  ADD COLUMN IF NOT EXISTS registration_eligibility_days INTEGER NOT NULL DEFAULT 0;

ALTER TABLE lead_entitlement_business_campaigns
  DROP CONSTRAINT IF EXISTS lead_entitlement_business_campaigns_registration_eligibility_days_check;

ALTER TABLE lead_entitlement_business_campaigns
  ADD CONSTRAINT lead_entitlement_business_campaigns_registration_eligibility_days_check
  CHECK(registration_eligibility_days BETWEEN 0 AND 365);
