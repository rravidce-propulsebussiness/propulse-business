-- Campaigns that award free leads when a completed project is uploaded soon
-- after signup. Zero means no account-age condition, preserving prior campaigns.
ALTER TABLE lead_entitlement_business_campaigns
  ADD COLUMN IF NOT EXISTS project_registration_window_days INTEGER NOT NULL DEFAULT 0
  CHECK(project_registration_window_days BETWEEN 0 AND 365);

-- Purchase-linked coupon audience filters. These do not themselves issue a
-- free lead reward: no-purchase registration rewards use the existing grants.
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS verification_scope VARCHAR(20) NOT NULL DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS registration_max_age_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_verification_scope_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_verification_scope_check
  CHECK(verification_scope IN ('any','verified','unverified'));
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_registration_max_age_days_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_registration_max_age_days_check
  CHECK(registration_max_age_days BETWEEN 0 AND 365);
