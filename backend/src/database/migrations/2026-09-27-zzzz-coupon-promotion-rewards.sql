BEGIN;

-- Extend the canonical coupons table into a promotion engine.
-- No second promotions table is created: discount coupons and reward offers share the same targeting,
-- validity, usage-limit and redemption rules.
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS benefit_type VARCHAR(30) NOT NULL DEFAULT 'discount',
  ADD COLUMN IF NOT EXISTS reward_value_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS reward_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_lead_type VARCHAR(20) NOT NULL DEFAULT 'shared',
  ADD COLUMN IF NOT EXISTS bonus_lead_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_valid_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS is_public_offer BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_discount_value_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_discount_value_check CHECK (discount_value >= 0);
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_benefit_type_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_benefit_type_check CHECK (benefit_type IN ('discount','wallet_bonus','lead_bonus'));
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_reward_value_type_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_reward_value_type_check CHECK (reward_value_type IN ('fixed','percent'));
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_reward_value_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_reward_value_check CHECK (reward_value >= 0);
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_bonus_lead_type_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_bonus_lead_type_check CHECK (bonus_lead_type IN ('shared','premium'));
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_bonus_lead_quantity_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_bonus_lead_quantity_check CHECK (bonus_lead_quantity BETWEEN 0 AND 1000);
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_bonus_valid_days_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_bonus_valid_days_check CHECK (bonus_valid_days BETWEEN 0 AND 3650);

-- Existing lead-entitlement grants remain canonical for complimentary lead access.
-- Promotion rewards simply become another audited grant source.
ALTER TABLE lead_entitlement_grants DROP CONSTRAINT IF EXISTS lead_entitlement_grants_source_check;
ALTER TABLE lead_entitlement_grants
  ADD CONSTRAINT lead_entitlement_grants_source_check
  CHECK (source IN ('admin','new_business','campaign','promotion'));

CREATE TABLE IF NOT EXISTS coupon_rewards (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  reward_type VARCHAR(30) NOT NULL CHECK (reward_type IN ('wallet_bonus','lead_bonus')),
  reward_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  lead_grant_id INTEGER REFERENCES lead_entitlement_grants(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(payment_id)
);
CREATE INDEX IF NOT EXISTS idx_coupon_rewards_coupon ON coupon_rewards(coupon_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupon_rewards_user ON coupon_rewards(user_id,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coupons_public_offers
  ON coupons(is_public_offer,is_active,starts_at,expires_at)
  WHERE is_public_offer=TRUE;

COMMIT;
