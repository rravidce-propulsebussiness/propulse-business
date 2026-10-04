-- Automatic PIN detection and safe PIN -> Propulse City mapping metadata.
ALTER TABLE india_pincodes
  ADD COLUMN IF NOT EXISTS postal_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS postal_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS detected_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_india_pincodes_detected_at
  ON india_pincodes(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_city_pincodes_pincode_active
  ON city_pincodes(pincode, is_active);

CREATE INDEX IF NOT EXISTS idx_leads_pincode_city
  ON leads(pincode, city_id);
