-- Keep city PIN coverage synchronized with the India PIN directory.
-- A directory PIN is attached to a city only when its state matches and its
-- district name matches the city name. Lead/sub-city mappings remain additive.

CREATE OR REPLACE FUNCTION propulse_sync_directory_pincode_to_city()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_active = TRUE AND NULLIF(TRIM(NEW.district_name), '') IS NOT NULL THEN
    INSERT INTO city_pincodes(city_id, pincode, office_name, source, is_active)
    SELECT c.id, NEW.pincode, NULL, 'india-pincode-directory', TRUE
      FROM cities c
     WHERE c.is_active = TRUE
       AND c.state_id = NEW.state_id
       AND lower(trim(c.name)) = lower(trim(NEW.district_name))
    ON CONFLICT(city_id, pincode) DO UPDATE
      SET is_active = TRUE,
          source = CASE
            WHEN city_pincodes.source = 'admin' THEN city_pincodes.source
            ELSE EXCLUDED.source
          END,
          updated_at = CURRENT_TIMESTAMP;
  END IF;

  IF NEW.is_active = FALSE OR NULLIF(TRIM(NEW.district_name), '') IS NULL THEN
    DELETE FROM city_pincodes cp
     WHERE cp.pincode = NEW.pincode
       AND cp.source = 'india-pincode-directory'
       AND NOT EXISTS (
         SELECT 1 FROM india_pincodes ip
          WHERE ip.pincode = cp.pincode
            AND ip.is_active = TRUE
            AND ip.state_id = (SELECT state_id FROM cities WHERE id = cp.city_id)
            AND lower(trim(COALESCE(ip.district_name, ''))) = lower(trim((SELECT name FROM cities WHERE id = cp.city_id)))
       );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_directory_pincode_to_city ON india_pincodes;
CREATE TRIGGER trg_sync_directory_pincode_to_city
AFTER INSERT OR UPDATE OF pincode, state_id, district_name, is_active
ON india_pincodes
FOR EACH ROW EXECUTE FUNCTION propulse_sync_directory_pincode_to_city();

-- Backfill directory PINs already present before this trigger was installed.
INSERT INTO city_pincodes(city_id, pincode, office_name, source, is_active)
SELECT c.id, ip.pincode, NULL, 'india-pincode-directory', TRUE
  FROM india_pincodes ip
  JOIN cities c
    ON c.is_active = TRUE
   AND c.state_id = ip.state_id
   AND lower(trim(c.name)) = lower(trim(ip.district_name))
 WHERE ip.is_active = TRUE
   AND NULLIF(TRIM(ip.district_name), '') IS NOT NULL
ON CONFLICT(city_id, pincode) DO UPDATE
  SET is_active = TRUE,
      source = CASE
        WHEN city_pincodes.source = 'admin' THEN city_pincodes.source
        ELSE EXCLUDED.source
      END,
      updated_at = CURRENT_TIMESTAMP;

-- If an admin creates/renames a city after the directory has been loaded,
-- immediately populate the matching directory PINs.
CREATE OR REPLACE FUNCTION propulse_sync_city_directory_pincodes(p_city_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  added_count INTEGER;
BEGIN
  DELETE FROM city_pincodes cp
   WHERE cp.city_id = p_city_id
     AND cp.source = 'india-pincode-directory'
     AND NOT EXISTS (
       SELECT 1
         FROM india_pincodes ip
        WHERE ip.pincode = cp.pincode
          AND ip.is_active = TRUE
          AND ip.state_id = (SELECT state_id FROM cities WHERE id = p_city_id)
          AND lower(trim(COALESCE(ip.district_name, ''))) = lower(trim((SELECT name FROM cities WHERE id = p_city_id)))
     );

  INSERT INTO city_pincodes(city_id, pincode, office_name, source, is_active)
  SELECT c.id, ip.pincode, NULL, 'india-pincode-directory', TRUE
    FROM cities c
    JOIN india_pincodes ip
      ON ip.is_active = TRUE
     AND ip.state_id = c.state_id
     AND NULLIF(TRIM(ip.district_name), '') IS NOT NULL
     AND lower(trim(ip.district_name)) = lower(trim(c.name))
   WHERE c.id = p_city_id
  ON CONFLICT(city_id, pincode) DO UPDATE
    SET is_active = TRUE,
        source = CASE
          WHEN city_pincodes.source = 'admin' THEN city_pincodes.source
          ELSE EXCLUDED.source
        END,
        updated_at = CURRENT_TIMESTAMP;

  GET DIAGNOSTICS added_count = ROW_COUNT;
  RETURN added_count;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_city_directory_pincodes ON cities;
CREATE TRIGGER trg_sync_city_directory_pincodes
AFTER INSERT OR UPDATE OF state_id, name, is_active
ON cities
FOR EACH ROW EXECUTE FUNCTION propulse_sync_city_directory_pincodes(NEW.id);

SELECT propulse_sync_city_directory_pincodes(id) FROM cities WHERE is_active = TRUE;
