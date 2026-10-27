-- Extend existing promotions and lead entitlement campaigns. All existing coupons retain
-- their legacy single lead-type settings; no rewards are automatically activated.
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS bonus_premium_quantity INTEGER NOT NULL DEFAULT 0
  CHECK(bonus_premium_quantity BETWEEN 0 AND 1000);
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS membership_audiences JSONB NOT NULL DEFAULT '["all"]'::jsonb;
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_bonus_lead_type_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_bonus_lead_type_check
  CHECK(bonus_lead_type IN ('shared','premium','both'));
ALTER TABLE coupons ADD CONSTRAINT coupons_membership_audiences_array_check
  CHECK(jsonb_typeof(membership_audiences)='array');

ALTER TABLE lead_entitlement_business_campaigns
  ADD COLUMN IF NOT EXISTS min_completed_projects INTEGER NOT NULL DEFAULT 0
    CHECK (min_completed_projects BETWEEN 0 AND 20);

-- NOTE: status='verified' on a proof remains the only company verification source.
-- A published completed project does NOT itself confer verified status.
