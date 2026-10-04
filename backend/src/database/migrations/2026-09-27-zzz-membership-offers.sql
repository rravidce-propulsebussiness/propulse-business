BEGIN;

ALTER TABLE membership_pricing_rules
  ADD COLUMN IF NOT EXISTS offer_label VARCHAR(80);

ALTER TABLE membership_pricing_rules
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ;

ALTER TABLE membership_pricing_rules
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

ALTER TABLE membership_pricing_rules
  ADD COLUMN IF NOT EXISTS new_customer_days INTEGER
  CHECK (new_customer_days IS NULL OR (new_customer_days >= 1 AND new_customer_days <= 365));

CREATE INDEX IF NOT EXISTS idx_membership_pricing_rules_offer_window
  ON membership_pricing_rules(is_active,valid_from,valid_until,new_customer_days,updated_at DESC);

COMMIT;
