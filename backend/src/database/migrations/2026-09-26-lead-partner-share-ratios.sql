BEGIN;

ALTER TABLE lead_partner_settings
  ADD COLUMN IF NOT EXISTS two_share_percent NUMERIC(5,2) NOT NULL DEFAULT 60 CHECK (two_share_percent >= 0 AND two_share_percent <= 100);

ALTER TABLE lead_partner_settings
  ADD COLUMN IF NOT EXISTS three_share_percent NUMERIC(5,2) NOT NULL DEFAULT 45 CHECK (three_share_percent >= 0 AND three_share_percent <= 100);

UPDATE lead_partner_settings
SET two_share_percent=COALESCE(two_share_percent,60),
    three_share_percent=COALESCE(three_share_percent,45)
WHERE id=1;

COMMIT;
