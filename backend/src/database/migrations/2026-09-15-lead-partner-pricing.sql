BEGIN;

CREATE TABLE IF NOT EXISTS lead_partner_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 5 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  normal_price_uplift NUMERIC(12,2) NOT NULL DEFAULT 100 CHECK (normal_price_uplift >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO lead_partner_settings (id, commission_percent, normal_price_uplift)
VALUES (1, 5, 100)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS partner_base_pricing JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS partner_pricing_overridden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS partner_pricing_updated_at TIMESTAMP;

UPDATE leads
SET partner_base_pricing = pricing
WHERE created_by IS NOT NULL
  AND partner_base_pricing IS NULL
  AND EXISTS (SELECT 1 FROM users u WHERE u.id = leads.created_by AND u.role = 'lead_partner');

COMMIT;
