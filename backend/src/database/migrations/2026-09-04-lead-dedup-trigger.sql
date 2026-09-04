CREATE OR REPLACE FUNCTION prevent_duplicate_lead_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_phone TEXT := regexp_replace(COALESCE(NEW.customer_phone,''),'[^0-9]','','g');
  normalized_email TEXT := lower(trim(COALESCE(NEW.customer_email,'')));
  normalized_name TEXT := lower(trim(COALESCE(NEW.customer_name,'')));
  normalized_requirement TEXT := lower(trim(COALESCE(NEW.requirement,'')));
  duplicate_id INTEGER;
  lock_key TEXT;
BEGIN
  IF normalized_phone <> '' AND length(normalized_phone) >= 7 THEN
    lock_key := 'lead:phone:' || NEW.industry_id::text || ':' || normalized_phone;
    PERFORM pg_advisory_xact_lock(hashtext(lock_key));
    SELECT id INTO duplicate_id
    FROM leads
    WHERE industry_id=NEW.industry_id
      AND regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g')=normalized_phone
    LIMIT 1;
    IF duplicate_id IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate lead: this lead already exists', duplicate_id
        USING ERRCODE='23505', DETAIL='Duplicate phone number within the same industry';
    END IF;
  END IF;

  IF normalized_email <> '' THEN
    lock_key := 'lead:email:' || NEW.industry_id::text || ':' || normalized_email;
    PERFORM pg_advisory_xact_lock(hashtext(lock_key));
    SELECT id INTO duplicate_id
    FROM leads
    WHERE industry_id=NEW.industry_id
      AND lower(trim(COALESCE(customer_email,'')))=normalized_email
    LIMIT 1;
    IF duplicate_id IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate lead: this lead already exists', duplicate_id
        USING ERRCODE='23505', DETAIL='Duplicate email within the same industry';
    END IF;
  END IF;

  IF normalized_name <> '' AND normalized_requirement <> '' THEN
    lock_key := 'lead:name-requirement:' || NEW.industry_id::text || ':' || normalized_name || ':' || normalized_requirement;
    PERFORM pg_advisory_xact_lock(hashtext(lock_key));
    SELECT id INTO duplicate_id
    FROM leads
    WHERE industry_id=NEW.industry_id
      AND lower(trim(COALESCE(customer_name,'')))=normalized_name
      AND lower(trim(COALESCE(requirement,'')))=normalized_requirement
    LIMIT 1;
    IF duplicate_id IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate lead: this lead already exists', duplicate_id
        USING ERRCODE='23505', DETAIL='Duplicate customer and requirement within the same industry';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_lead_insert ON leads;
CREATE TRIGGER trg_prevent_duplicate_lead_insert
BEFORE INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_lead_insert();
