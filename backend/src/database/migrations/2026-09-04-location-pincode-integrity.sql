WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY city_id, pincode
           ORDER BY is_active DESC, updated_at DESC, id DESC
         ) AS row_number
  FROM city_pincodes
)
DELETE FROM city_pincodes cp
USING ranked r
WHERE cp.id = r.id
  AND r.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_city_pincodes_city_pincode
  ON city_pincodes(city_id, pincode);
