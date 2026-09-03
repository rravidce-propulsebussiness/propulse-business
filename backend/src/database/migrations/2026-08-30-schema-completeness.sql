-- Current schema completeness migration.
-- Establishes the legacy capabilities required by current services before dated feature migrations run.

CREATE TABLE IF NOT EXISTS lead_purchases (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shares INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  pricing_tier VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (pricing_tier IN ('normal','pro')),
  status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','refunded','cancelled')),
  purchased_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_lead ON lead_purchases(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_purchases_user ON lead_purchases(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_purchases_active_user ON lead_purchases(lead_id,user_id) WHERE status='paid';

CREATE TABLE IF NOT EXISTS lead_pricing_rules (
  id SERIAL PRIMARY KEY,
  industry_id INTEGER REFERENCES industries(id) ON DELETE CASCADE,
  city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
  pricing JSONB NOT NULL DEFAULT '{"shares":[{"shares":1,"normal":0,"pro":0},{"shares":3,"normal":0,"pro":0},{"shares":5,"normal":0,"pro":0}]}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT lead_pricing_rules_unique_scope UNIQUE (industry_id, city_id)
);
CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_industry ON lead_pricing_rules(industry_id);
CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_city ON lead_pricing_rules(city_id);
CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_active ON lead_pricing_rules(is_active);
ALTER TABLE lead_pricing_rules ADD COLUMN IF NOT EXISTS lead_type VARCHAR(20) NOT NULL DEFAULT 'basic';
ALTER TABLE lead_pricing_rules DROP CONSTRAINT IF EXISTS lead_pricing_rules_lead_type_check;
ALTER TABLE lead_pricing_rules ADD CONSTRAINT lead_pricing_rules_lead_type_check CHECK (lead_type IN ('basic','premium'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_pricing_rules_market_type ON lead_pricing_rules (COALESCE(industry_id,0),COALESCE(city_id,0),lead_type);
CREATE INDEX IF NOT EXISTS idx_lead_pricing_rules_market_type ON lead_pricing_rules (industry_id,city_id,lead_type,is_active);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_type VARCHAR(20) NOT NULL DEFAULT 'basic';
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_lead_type_check CHECK (lead_type IN ('basic','premium'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS exclusive_delay_days INTEGER NOT NULL DEFAULT 1;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_exclusive_delay_days_check;
ALTER TABLE leads ADD CONSTRAINT leads_exclusive_delay_days_check CHECK (exclusive_delay_days >= 0 AND exclusive_delay_days <= 365);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pricing JSONB NOT NULL DEFAULT '{"shares":[{"shares":1,"normal":0,"pro":0},{"shares":3,"normal":0,"pro":0},{"shares":5,"normal":0,"pro":0}]}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS exclusive_delay_hours INTEGER NOT NULL DEFAULT 24;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_exclusive_delay_hours_check;
ALTER TABLE leads ADD CONSTRAINT leads_exclusive_delay_hours_check CHECK (exclusive_delay_hours >= 0 AND exclusive_delay_hours <= 8760);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS buyer_capacity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_buyer_capacity_check;
ALTER TABLE leads ADD CONSTRAINT leads_buyer_capacity_check CHECK (buyer_capacity > 0);
CREATE INDEX IF NOT EXISTS idx_leads_buyer_capacity ON leads(buyer_capacity);
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_exclusive_access ON leads(is_exclusive,lead_type,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_custom_fields ON leads USING GIN(custom_fields);

ALTER TABLE leads ALTER COLUMN industry_id SET NOT NULL;
ALTER TABLE leads ALTER COLUMN service_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN subservice_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN state_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN city_id DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN customer_phone DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN requirement DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN source DROP NOT NULL;

ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS plan_group VARCHAR(120);
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS plan_type VARCHAR(30) NOT NULL DEFAULT 'non_pro';
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS billing_period VARCHAR(40) NOT NULL DEFAULT 'yearly';
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS billing_months INTEGER NOT NULL DEFAULT 1;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS monthly_base_price NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS benefits JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS lead_entitlements JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS add_ons JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS lead_rollover_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS lead_expiry_days INTEGER;
ALTER TABLE membership_plans DROP CONSTRAINT IF EXISTS membership_plans_plan_type_check;
ALTER TABLE membership_plans ADD CONSTRAINT membership_plans_plan_type_check CHECK(plan_type IN ('pro','investor','booster','non_pro'));
ALTER TABLE membership_plans DROP CONSTRAINT IF EXISTS membership_plans_discount_check;
ALTER TABLE membership_plans ADD CONSTRAINT membership_plans_discount_check CHECK(discount_percent>=0 AND discount_percent<=100);
ALTER TABLE membership_plans DROP CONSTRAINT IF EXISTS membership_plans_lead_expiry_check;
ALTER TABLE membership_plans ADD CONSTRAINT membership_plans_lead_expiry_check CHECK(lead_expiry_days IS NULL OR lead_expiry_days>0);
UPDATE membership_plans SET plan_group=COALESCE(plan_group,name),monthly_base_price=CASE WHEN monthly_base_price=0 THEN price ELSE monthly_base_price END WHERE plan_group IS NULL OR monthly_base_price=0;
CREATE INDEX IF NOT EXISTS idx_membership_plans_group ON membership_plans(plan_group);
CREATE INDEX IF NOT EXISTS idx_membership_plans_tier_period_active ON membership_plans(plan_type,billing_months,is_active);

CREATE TABLE IF NOT EXISTS investor_settings (id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id=1), global_limit INTEGER NOT NULL DEFAULT 100 CHECK(global_limit>=0), default_industry_limit INTEGER NOT NULL DEFAULT 10 CHECK(default_industry_limit>=0), min_investment NUMERIC(12,2) NOT NULL DEFAULT 25000 CHECK(min_investment>=0), max_investment NUMERIC(12,2), enabled BOOLEAN NOT NULL DEFAULT TRUE, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT INTO investor_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
ALTER TABLE investor_settings ADD COLUMN IF NOT EXISTS requires_pro BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE investor_settings ADD COLUMN IF NOT EXISTS customer_industry_limit INTEGER NOT NULL DEFAULT 10;
UPDATE investor_settings SET requires_pro=TRUE,customer_industry_limit=COALESCE(customer_industry_limit,default_industry_limit,10) WHERE id=1;
CREATE TABLE IF NOT EXISTS investor_industry_limits (id SERIAL PRIMARY KEY, industry_id INTEGER NOT NULL UNIQUE REFERENCES industries(id) ON DELETE CASCADE, investor_limit INTEGER NOT NULL CHECK(investor_limit>=0), is_active BOOLEAN NOT NULL DEFAULT TRUE, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS coupons (id SERIAL PRIMARY KEY, code VARCHAR(50) NOT NULL UNIQUE, discount_type VARCHAR(20) NOT NULL CHECK(discount_type IN ('percent','fixed')), discount_value NUMERIC(12,2) NOT NULL CHECK(discount_value>0), max_discount NUMERIC(12,2), min_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(min_order_amount>=0), usage_limit INTEGER, used_count INTEGER NOT NULL DEFAULT 0, starts_at TIMESTAMP, expires_at TIMESTAMP, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CHECK(expires_at IS NULL OR starts_at IS NULL OR expires_at>starts_at), CHECK(discount_type<>'percent' OR discount_value<=100));
CREATE INDEX IF NOT EXISTS idx_coupons_active_dates ON coupons(is_active,expires_at);

ALTER TABLE memberships ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='memberships' AND column_name='ends_at') THEN
    UPDATE memberships SET expires_at=COALESCE(expires_at,ends_at) WHERE expires_at IS NULL;
  END IF;
END $$;
ALTER TABLE memberships ALTER COLUMN expires_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memberships_expires_at ON memberships(expires_at);

CREATE TABLE IF NOT EXISTS lead_entitlement_claims (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  membership_id INTEGER REFERENCES memberships(id) ON DELETE SET NULL,
  entitlement_type VARCHAR(30) NOT NULL,
  claimed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE(user_id,lead_id)
);
CREATE INDEX IF NOT EXISTS idx_lead_claims_user_claimed ON lead_entitlement_claims(user_id,claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_claims_lead ON lead_entitlement_claims(lead_id);
