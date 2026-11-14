-- Platform promotions must not reduce Lead Partner earnings or give partner leads away for free.
-- Coupons (and the bonus lead credits they grant) apply only to ProPulse-owned leads unless Admin
-- explicitly enables them for Lead Partner leads on that coupon.
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS applies_to_partner_leads BOOLEAN NOT NULL DEFAULT FALSE;
