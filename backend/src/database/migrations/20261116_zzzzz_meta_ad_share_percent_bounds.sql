ALTER TABLE meta_ad_pricing_settings
  DROP CONSTRAINT IF EXISTS meta_ad_pricing_settings_two_share_percent_check,
  DROP CONSTRAINT IF EXISTS meta_ad_pricing_settings_three_share_percent_check;

ALTER TABLE meta_ad_pricing_settings
  ADD CONSTRAINT meta_ad_pricing_settings_two_share_percent_check
    CHECK (two_share_percent >= 0 AND two_share_percent <= 100),
  ADD CONSTRAINT meta_ad_pricing_settings_three_share_percent_check
    CHECK (three_share_percent >= 0 AND three_share_percent <= 100);
