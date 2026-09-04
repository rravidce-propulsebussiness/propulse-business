-- Make city PIN coverage truly city-wise: one active row per city + pincode.
-- Existing duplicate rows are consolidated before the unique index is added.

DELETE FROM city_pincodes a
USING city_pincodes b
WHERE a.city_id = b.city_id
  AND a.pincode = b.pincode
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_city_pincodes_city_pincode
  ON city_pincodes(city_id, pincode);

CREATE INDEX IF NOT EXISTS idx_city_pincodes_city_pincode_active
  ON city_pincodes(city_id, pincode)
  WHERE is_active = TRUE;
