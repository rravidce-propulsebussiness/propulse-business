-- Lead PIN -> location coverage mapping.
-- Keeps the location master derived from PINs actually received on leads,
-- while preserving existing city/sub-city rows and preventing duplicates.

CREATE OR REPLACE FUNCTION propulse_normalize_pincode(raw TEXT)
RETURNS VARCHAR(6)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  match TEXT[];
BEGIN
  match := regexp_match(COALESCE(raw, ''), '(^|[^0-9])([0-9]{6})([^0-9]|$)');
  IF match IS NULL THEN RETURN NULL; END IF;
  RETURN match[2];
END;
$$;

CREATE OR REPLACE FUNCTION propulse_extract_lead_pincode(fields JSONB)
RETURNS VARCHAR(6)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  item RECORD;
  normalized_key TEXT;
  value_pin VARCHAR(6);
BEGIN
  IF fields IS NULL OR jsonb_typeof(fields) <> 'object' THEN RETURN NULL; END IF;
  FOR item IN SELECT key, value FROM jsonb_each_text(fields) LOOP
    normalized_key := regexp_replace(lower(item.key), '[^a-z0-9]', '', 'g');
    IF normalized_key IN ('pincode', 'zipcode', 'postalcode', 'zip') THEN
      value_pin := propulse_normalize_pincode(item.value);
      IF value_pin IS NOT NULL THEN RETURN value_pin; END IF;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION propulse_extract_lead_area(fields JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  item RECORD;
  normalized_key TEXT;
BEGIN
  IF fields IS NULL OR jsonb_typeof(fields) <> 'object' THEN RETURN NULL; END IF;
  FOR item IN SELECT key, value FROM jsonb_each_text(fields) LOOP
    normalized_key := regexp_replace(lower(item.key), '[^a-z0-9]', '', 'g');
    IF normalized_key IN ('subcity', 'suburb', 'area', 'locality', 'neighborhood', 'neighbourhood', 'locationarea')
       AND NULLIF(trim(item.value), '') IS NOT NULL THEN
      RETURN trim(item.value);
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION propulse_resolve_lead_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  derived_pin VARCHAR(6);
  derived_area TEXT;
  resolved_city INTEGER;
  resolved_subcity INTEGER;
BEGIN
  derived_pin := propulse_normalize_pincode(NEW.pincode);
  IF derived_pin IS NULL THEN derived_pin := propulse_extract_lead_pincode(NEW.custom_fields); END IF;
  IF derived_pin IS NOT NULL THEN NEW.pincode := derived_pin; END IF;

  IF NEW.pincode IS NOT NULL AND NEW.city_id IS NULL THEN
    SELECT c.id INTO resolved_city
      FROM cities c
      JOIN states st ON st.id=c.state_id AND st.is_active=TRUE
     WHERE c.is_active=TRUE
       AND (NEW.state_id IS NULL OR c.state_id=NEW.state_id)
       AND EXISTS (
         SELECT 1 FROM india_pincodes ip
          WHERE ip.pincode=NEW.pincode AND ip.is_active=TRUE
            AND (ip.state_id IS NULL OR ip.state_id=c.state_id)
            AND lower(COALESCE(ip.district_name,''))=lower(c.name)
       )
     ORDER BY CASE WHEN NEW.state_id IS NOT NULL AND c.state_id=NEW.state_id THEN 0 ELSE 1 END,c.id
     LIMIT 1;

    IF resolved_city IS NULL THEN
      SELECT cp.city_id INTO resolved_city
        FROM city_pincodes cp
        JOIN cities c ON c.id=cp.city_id AND c.is_active=TRUE
       WHERE cp.pincode=NEW.pincode AND cp.is_active=TRUE
         AND (NEW.state_id IS NULL OR c.state_id=NEW.state_id)
       GROUP BY cp.city_id ORDER BY cp.city_id LIMIT 1;
    END IF;

    IF resolved_city IS NOT NULL THEN
      NEW.city_id := resolved_city;
      IF NEW.state_id IS NULL THEN SELECT state_id INTO NEW.state_id FROM cities WHERE id=resolved_city; END IF;
    END IF;
  END IF;

  derived_area := propulse_extract_lead_area(NEW.custom_fields);
  IF NEW.city_id IS NOT NULL AND derived_area IS NOT NULL THEN
    SELECT sc.id INTO resolved_subcity
      FROM subcities sc
     WHERE sc.city_id=NEW.city_id AND sc.is_active=TRUE
       AND (
         lower(regexp_replace(sc.name,'[^a-z0-9]','','g'))=lower(regexp_replace(derived_area,'[^a-z0-9]','','g'))
         OR lower(regexp_replace(sc.slug,'[^a-z0-9]','','g'))=lower(regexp_replace(derived_area,'[^a-z0-9]','','g'))
       )
     ORDER BY sc.id LIMIT 1;
    IF resolved_subcity IS NOT NULL THEN NEW.subcity_id := resolved_subcity; END IF;
  END IF;

  IF NEW.city_id IS NOT NULL AND NEW.subcity_id IS NULL AND NEW.pincode IS NOT NULL THEN
    SELECT sc.id INTO resolved_subcity
      FROM subcities sc
     WHERE sc.city_id=NEW.city_id AND sc.is_active=TRUE AND sc.pincode=NEW.pincode
     ORDER BY sc.id LIMIT 1;
    IF resolved_subcity IS NOT NULL THEN NEW.subcity_id := resolved_subcity; END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolve_lead_location ON leads;
CREATE TRIGGER trg_resolve_lead_location
BEFORE INSERT OR UPDATE OF pincode, custom_fields, state_id, city_id, subcity_id
ON leads FOR EACH ROW EXECUTE FUNCTION propulse_resolve_lead_location();

CREATE OR REPLACE FUNCTION propulse_sync_lead_location_coverage()
RETURNS TABLE(mapped_leads INTEGER, city_pins_added INTEGER, subcity_pins_updated INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  mapped_count INTEGER := 0;
  city_pin_count INTEGER := 0;
  subcity_pin_count INTEGER := 0;
BEGIN
  UPDATE leads l
     SET pincode=propulse_extract_lead_pincode(l.custom_fields),updated_at=CURRENT_TIMESTAMP
   WHERE (l.pincode IS NULL OR l.pincode !~ '^[0-9]{6}$')
     AND propulse_extract_lead_pincode(l.custom_fields) IS NOT NULL;
  GET DIAGNOSTICS mapped_count=ROW_COUNT;

  UPDATE leads l
     SET city_id=resolved.city_id,
         state_id=COALESCE(l.state_id,resolved.state_id),
         updated_at=CURRENT_TIMESTAMP
    FROM (
      SELECT DISTINCT ON (l2.id) l2.id AS lead_id,c.id AS city_id,c.state_id
        FROM leads l2
        JOIN india_pincodes ip ON ip.pincode=l2.pincode AND ip.is_active=TRUE
        JOIN cities c ON c.is_active=TRUE
          AND (l2.state_id IS NULL OR c.state_id=l2.state_id)
          AND lower(COALESCE(ip.district_name,''))=lower(c.name)
       WHERE l2.pincode ~ '^[0-9]{6}$'
       ORDER BY l2.id,CASE WHEN l2.state_id IS NOT NULL AND c.state_id=l2.state_id THEN 0 ELSE 1 END,c.id
    ) resolved
   WHERE l.id=resolved.lead_id AND l.city_id IS NULL;

  INSERT INTO city_pincodes(city_id,pincode,office_name,source,is_active)
  SELECT l.city_id,l.pincode,NULL,'lead-data',TRUE
    FROM leads l
   WHERE l.city_id IS NOT NULL AND l.pincode ~ '^[0-9]{6}$'
   GROUP BY l.city_id,l.pincode
  ON CONFLICT(city_id,pincode) DO UPDATE
    SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP;
  GET DIAGNOSTICS city_pin_count=ROW_COUNT;

  UPDATE subcities sc
     SET pincode=l.pincode,updated_at=CURRENT_TIMESTAMP
    FROM leads l
   WHERE l.subcity_id=sc.id AND sc.is_active=TRUE AND l.pincode ~ '^[0-9]{6}$'
     AND (sc.pincode IS NULL OR sc.pincode<>l.pincode);
  GET DIAGNOSTICS subcity_pin_count=ROW_COUNT;

  RETURN QUERY SELECT mapped_count,city_pin_count,subcity_pin_count;
END;
$$;

-- Safe, repeatable backfill for all existing lead PINs.
SELECT * FROM propulse_sync_lead_location_coverage();

UPDATE cities c SET location_sync_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
 WHERE c.id IN (SELECT DISTINCT l.city_id FROM leads l WHERE l.city_id IS NOT NULL AND l.pincode ~ '^[0-9]{6}$');

CREATE OR REPLACE FUNCTION propulse_sync_single_lead_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.city_id IS NOT NULL AND NEW.pincode ~ '^[0-9]{6}$' THEN
    INSERT INTO city_pincodes(city_id,pincode,office_name,source,is_active)
    VALUES(NEW.city_id,NEW.pincode,NULL,'lead-data',TRUE)
    ON CONFLICT(city_id,pincode) DO UPDATE SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP;

    IF NEW.subcity_id IS NOT NULL THEN
      UPDATE subcities SET pincode=NEW.pincode,updated_at=CURRENT_TIMESTAMP
       WHERE id=NEW.subcity_id AND is_active=TRUE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_single_lead_location ON leads;
CREATE TRIGGER trg_sync_single_lead_location
AFTER INSERT OR UPDATE OF pincode,state_id,city_id,subcity_id,custom_fields
ON leads FOR EACH ROW EXECUTE FUNCTION propulse_sync_single_lead_location();
