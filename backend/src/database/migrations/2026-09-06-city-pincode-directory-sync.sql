-- Keep the admin city PIN index synchronized with the canonical India PIN directory.
-- The directory table is owned by this migration so fresh environments have the same
-- contract used by pincodeService.
CREATE TABLE IF NOT EXISTS india_pincodes (
  pincode VARCHAR(6) PRIMARY KEY,
  state_id INTEGER REFERENCES states(id) ON DELETE SET NULL,
  state_name VARCHAR(100),
  district_name VARCHAR(160),
  office_count INTEGER NOT NULL DEFAULT 0,
  source VARCHAR(80) NOT NULL DEFAULT 'india-post-open-api',
  synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (pincode ~ '^[0-9]{6}$')
);
CREATE INDEX IF NOT EXISTS idx_india_pincodes_state_district
  ON india_pincodes(state_id, lower(district_name));
CREATE INDEX IF NOT EXISTS idx_india_pincodes_active
  ON india_pincodes(is_active);

CREATE OR REPLACE FUNCTION propulse_sync_directory_pincode_to_city()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM TRUE THEN
    UPDATE city_pincodes
       SET is_active=FALSE,
           updated_at=CURRENT_TIMESTAMP
     WHERE pincode=NEW.pincode
       AND source='india-post-open-api';
    RETURN NEW;
  END IF;

  INSERT INTO city_pincodes(city_id,pincode,office_name,source,is_active)
  SELECT c.id,
         NEW.pincode,
         NULLIF(NEW.district_name,'') AS office_name,
         'india-post-open-api',
         TRUE
    FROM cities c
   WHERE c.is_active=TRUE
     AND (NEW.state_id IS NULL OR c.state_id=NEW.state_id)
     AND NEW.district_name IS NOT NULL
     AND lower(trim(c.name))=lower(trim(NEW.district_name))
  ON CONFLICT(city_id,pincode) DO UPDATE
    SET office_name=COALESCE(EXCLUDED.office_name,city_pincodes.office_name),
        source='india-post-open-api',
        is_active=TRUE,
        updated_at=CURRENT_TIMESTAMP;

  UPDATE city_pincodes cp
     SET is_active=FALSE,
         updated_at=CURRENT_TIMESTAMP
   WHERE cp.pincode=NEW.pincode
     AND cp.source='india-post-open-api'
     AND NOT EXISTS (
       SELECT 1
         FROM cities c
        WHERE c.id=cp.city_id
          AND c.is_active=TRUE
          AND (NEW.state_id IS NULL OR c.state_id=NEW.state_id)
          AND NEW.district_name IS NOT NULL
          AND lower(trim(c.name))=lower(trim(NEW.district_name))
     );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_directory_pincode_to_city ON india_pincodes;
CREATE TRIGGER trg_sync_directory_pincode_to_city
AFTER INSERT OR UPDATE OF pincode,state_id,state_name,district_name,is_active
ON india_pincodes
FOR EACH ROW
EXECUTE FUNCTION propulse_sync_directory_pincode_to_city();

CREATE OR REPLACE FUNCTION propulse_sync_city_directory_pincodes(p_city_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  synced_count INTEGER := 0;
BEGIN
  INSERT INTO city_pincodes(city_id,pincode,office_name,source,is_active)
  SELECT c.id,
         ip.pincode,
         NULLIF(ip.district_name,'') AS office_name,
         'india-post-open-api',
         TRUE
    FROM cities c
    JOIN india_pincodes ip
      ON ip.is_active=TRUE
     AND (ip.state_id IS NULL OR ip.state_id=c.state_id)
     AND ip.district_name IS NOT NULL
     AND lower(trim(c.name))=lower(trim(ip.district_name))
   WHERE c.id=p_city_id
     AND c.is_active=TRUE
  ON CONFLICT(city_id,pincode) DO UPDATE
    SET office_name=COALESCE(EXCLUDED.office_name,city_pincodes.office_name),
        source='india-post-open-api',
        is_active=TRUE,
        updated_at=CURRENT_TIMESTAMP;

  UPDATE city_pincodes cp
     SET is_active=FALSE,
         updated_at=CURRENT_TIMESTAMP
   WHERE cp.city_id=p_city_id
     AND cp.source='india-post-open-api'
     AND NOT EXISTS (
       SELECT 1
         FROM cities c
         JOIN india_pincodes ip
           ON ip.is_active=TRUE
          AND (ip.state_id IS NULL OR ip.state_id=c.state_id)
          AND ip.district_name IS NOT NULL
          AND lower(trim(c.name))=lower(trim(ip.district_name))
        WHERE c.id=p_city_id
          AND ip.pincode=cp.pincode
     );

  SELECT COUNT(*)::INTEGER
    INTO synced_count
    FROM city_pincodes
   WHERE city_id=p_city_id
     AND source='india-post-open-api'
     AND is_active=TRUE;

  RETURN synced_count;
END;
$$;

CREATE OR REPLACE FUNCTION propulse_sync_city_directory_pincodes_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM propulse_sync_city_directory_pincodes(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_city_directory_pincodes ON cities;
CREATE TRIGGER trg_sync_city_directory_pincodes
AFTER INSERT OR UPDATE OF state_id,name,is_active
ON cities
FOR EACH ROW
EXECUTE FUNCTION propulse_sync_city_directory_pincodes_trigger();

-- Backfill the existing directory into the city index without touching admin PINs.
DO $$
DECLARE
  city_row RECORD;
BEGIN
  FOR city_row IN SELECT id FROM cities WHERE is_active=TRUE LOOP
    PERFORM propulse_sync_city_directory_pincodes(city_row.id);
  END LOOP;
END;
$$;
