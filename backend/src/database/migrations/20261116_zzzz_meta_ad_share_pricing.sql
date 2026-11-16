ALTER TABLE meta_ad_pricing_settings
  ADD COLUMN IF NOT EXISTS two_share_percent NUMERIC(5,2) NOT NULL DEFAULT 60
    CHECK (two_share_percent >= 1 AND two_share_percent <= 100),
  ADD COLUMN IF NOT EXISTS three_share_percent NUMERIC(5,2) NOT NULL DEFAULT 45
    CHECK (three_share_percent >= 1 AND three_share_percent <= 100);
