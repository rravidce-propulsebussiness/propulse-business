BEGIN;

-- Extend the existing coupons foundation with targeting, per-user limits,
-- purchase scope, and an auditable redemption ledger. No second coupon table.
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS per_user_limit INTEGER;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS purchase_types JSONB NOT NULL DEFAULT '["membership","lead","booster"]'::jsonb;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS membership_plan_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_per_user_limit_check;
ALTER TABLE coupons ADD CONSTRAINT coupons_per_user_limit_check CHECK (per_user_limit IS NULL OR per_user_limit > 0);

CREATE TABLE IF NOT EXISTS coupon_users (
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_coupon_users_user ON coupon_users(user_id);

CREATE TABLE IF NOT EXISTS coupon_industries (
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id,industry_id)
);
CREATE INDEX IF NOT EXISTS idx_coupon_industries_industry ON coupon_industries(industry_id);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  purchase_type VARCHAR(30) NOT NULL,
  purchase_id BIGINT,
  discount_amount NUMERIC(12,2) NOT NULL CHECK (discount_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','redeemed','released')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  redeemed_at TIMESTAMP,
  released_at TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_redemption_payment ON coupon_redemptions(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions(coupon_id,user_id,status);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id,status);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(12,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);
CREATE INDEX IF NOT EXISTS idx_payments_coupon ON payments(coupon_id);

COMMIT;
