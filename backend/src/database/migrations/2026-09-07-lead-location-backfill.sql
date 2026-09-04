-- Complete the existing lead-location backfill for area/sub-city fields and make
-- custom-field PIN changes authoritative on future lead updates.

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
  IF TG_OP='INSERT' OR NEW.pincode IS DISTINCT FROM OLD.pincode THEN
    derived_pin := propulse_normalize_pincode(NEW.pincode);
  ELSE
    derived_pin := propulse_extract_lead_pincode(NEW.custom_fields);
  END IF;
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
    SELECT sc.id INTO resolved_subcity FROM subcities sc
     WHERE sc.city_id=NEW.city_id AND sc.is_active=TRUE AND sc.pincode=NEW.pincode
     ORDER BY sc.id LIMIT 1;
    IF resolved_subcity IS NOT NULL THEN NEW.subcity_id := resolved_subcity; END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Re-run the safe coverage procedure after the corrected resolver is installed.
SELECT * FROM propulse_sync_lead_location_coverage();

-- The procedure above updates city coverage from every lead PIN. This final
-- pass also maps legacy area fields that existed before the first migration.
UPDATE leads l
   SET subcity_id = resolved.subcity_id,
       updated_at = CURRENT_TIMESTAMP
  FROM (
    SELECT DISTINCT ON (l2.id) l2.id AS lead_id, sc.id AS subcity_id
      FROM leads l2
      CROSS JOIN LATERAL (SELECT propulse_extract_lead_area(l2.custom_fields) AS area) a
      JOIN subcities sc
        ON sc.city_id=l2.city_id
       AND sc.is_active=TRUE
       AND a.area IS NOT NULL
       AND (
         lower(regexp_replace(sc.name,'[^a-z0-9]','','g'))=lower(regexp_replace(a.area,'[^a-z0-9]','','g'))
         OR lower(regexp_replace(sc.slug,'[^a-z0-9]','','g'))=lower(regexp_replace(a.area,'[^a-z0-9]','','g'))
       )
     WHERE l2.city_id IS NOT NULL AND l2.subcity_id IS NULL
     ORDER BY l2.id,sc.id
  ) resolved
 WHERE l.id=resolved.lead_id;

UPDATE subcities sc
   SET pincode=l.pincode,updated_at=CURRENT_TIMESTAMP
  FROM leads l
 WHERE l.subcity_id=sc.id
   AND sc.is_active=TRUE
   AND l.pincode ~ '^[0-9]{6}$'
   AND (sc.pincode IS NULL OR sc.pincode<>l.pincode);
