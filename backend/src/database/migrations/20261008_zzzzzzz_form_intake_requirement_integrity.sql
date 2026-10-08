-- Each public/customer/project form has an idempotent intake_submission_key.
-- Do not deduplicate these form submissions by contact or a generated
-- Requirement: different forms/projects from the same customer are separate.
-- The unique index on intake_submission_key still blocks duplicate retries.
-- Manual, import and partner leads retain existing duplicate safeguards.

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
  -- Blank written requirements are valid when the detailed form answers exist.
  -- The unique intake_submission_key prevents repeat clicks; deduplication by
  -- phone alone would incorrectly merge different projects from one customer.
  IF NEW.source IN ('public_requirement','homepage_consultation','professional_project_quote','professional_project_callback') AND NULLIF(BTRIM(COALESCE(NEW.intake_submission_key,'')),'') IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.intake_submission_key IS NOT NULL AND btrim(NEW.intake_submission_key) <> '' THEN
    lock_key := 'lead:intake:' || NEW.intake_submission_key;
    PERFORM pg_advisory_xact_lock(hashtext(lock_key));
  END IF;

  IF normalized_phone <> '' AND length(normalized_phone) >= 7 THEN
    lock_key := 'lead:phone:' || NEW.industry_id::text || ':' ||
      COALESCE(NEW.service_id::text,'') || ':' ||
      COALESCE(NEW.subservice_id::text,'') || ':' || normalized_phone || ':' || normalized_requirement;
    PERFORM pg_advisory_xact_lock(hashtext(lock_key));

    SELECT id INTO duplicate_id
    FROM leads
    WHERE industry_id=NEW.industry_id
      AND service_id IS NOT DISTINCT FROM NEW.service_id
      AND subservice_id IS NOT DISTINCT FROM NEW.subservice_id
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      AND regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g')=normalized_phone
      AND (normalized_requirement='' OR lower(trim(COALESCE(requirement,'')))=normalized_requirement)
    LIMIT 1;

    IF duplicate_id IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate lead: a recent matching requirement already exists (id=%)', duplicate_id
        USING ERRCODE='23505', DETAIL='Recent duplicate phone within the same lead scope';
    END IF;
  END IF;

  IF normalized_email <> '' THEN
    lock_key := 'lead:email:' || NEW.industry_id::text || ':' ||
      COALESCE(NEW.service_id::text,'') || ':' ||
      COALESCE(NEW.subservice_id::text,'') || ':' || normalized_email || ':' || normalized_requirement;
    PERFORM pg_advisory_xact_lock(hashtext(lock_key));

    SELECT id INTO duplicate_id
    FROM leads
    WHERE industry_id=NEW.industry_id
      AND service_id IS NOT DISTINCT FROM NEW.service_id
      AND subservice_id IS NOT DISTINCT FROM NEW.subservice_id
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      AND lower(trim(COALESCE(customer_email,'')))=normalized_email
      AND (normalized_requirement='' OR lower(trim(COALESCE(requirement,'')))=normalized_requirement)
    LIMIT 1;

    IF duplicate_id IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate lead: a recent matching requirement already exists (id=%)', duplicate_id
        USING ERRCODE='23505', DETAIL='Recent duplicate email within the same lead scope';
    END IF;
  END IF;

  IF normalized_name <> '' AND normalized_requirement <> '' THEN
    lock_key := 'lead:name-requirement:' || NEW.industry_id::text || ':' ||
      COALESCE(NEW.service_id::text,'') || ':' ||
      COALESCE(NEW.subservice_id::text,'') || ':' ||
      normalized_name || ':' || normalized_requirement;
    PERFORM pg_advisory_xact_lock(hashtext(lock_key));

    SELECT id INTO duplicate_id
    FROM leads
    WHERE industry_id=NEW.industry_id
      AND service_id IS NOT DISTINCT FROM NEW.service_id
      AND subservice_id IS NOT DISTINCT FROM NEW.subservice_id
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      AND lower(trim(COALESCE(customer_name,'')))=normalized_name
      AND lower(trim(COALESCE(requirement,'')))=normalized_requirement
    LIMIT 1;

    IF duplicate_id IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate lead: a recent matching requirement already exists (id=%)', duplicate_id
        USING ERRCODE='23505', DETAIL='Recent duplicate customer and requirement within the same lead scope';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_duplicate_lead_change()
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
  -- Public intake enrichment may replace an earlier consultation record.
  -- Distinct submissions are identified by intake_submission_key, not phone.
  IF NEW.source IN ('public_requirement','homepage_consultation','professional_project_quote','professional_project_callback') AND NULLIF(BTRIM(COALESCE(NEW.intake_submission_key,'')),'') IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF normalized_phone <> '' AND length(normalized_phone) >= 7 THEN
    lock_key := 'lead:phone:' || NEW.industry_id::text || ':' || normalized_phone;
    PERFORM pg_advisory_xact_lock(hashtext(lock_key));
    SELECT id INTO duplicate_id FROM leads
    WHERE industry_id=NEW.industry_id AND id<>NEW.id
      AND regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g')=normalized_phone
    LIMIT 1;
    IF duplicate_id IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate lead: this lead already exists (id=%)', duplicate_id
        USING ERRCODE='23505', DETAIL='Duplicate phone number within the same industry';
    END IF;
  END IF;

  IF normalized_email <> '' THEN
    lock_key := 'lead:email:' || NEW.industry_id::text || ':' || normalized_email;
    PERFORM pg_advisory_xact_lock(hashtext(lock_key));
    SELECT id INTO duplicate_id FROM leads
    WHERE industry_id=NEW.industry_id AND id<>NEW.id
      AND lower(trim(COALESCE(customer_email,'')))=normalized_email
    LIMIT 1;
    IF duplicate_id IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate lead: this lead already exists (id=%)', duplicate_id
        USING ERRCODE='23505', DETAIL='Duplicate email within the same industry';
    END IF;
  END IF;

  IF normalized_name <> '' AND normalized_requirement <> '' THEN
    lock_key := 'lead:name-requirement:' || NEW.industry_id::text || ':' || normalized_name || ':' || normalized_requirement;
    PERFORM pg_advisory_xact_lock(hashtext(lock_key));
    SELECT id INTO duplicate_id FROM leads
    WHERE industry_id=NEW.industry_id AND id<>NEW.id
      AND lower(trim(COALESCE(customer_name,'')))=normalized_name
      AND lower(trim(COALESCE(requirement,'')))=normalized_requirement
    LIMIT 1;
    IF duplicate_id IS NOT NULL THEN
      RAISE EXCEPTION 'Duplicate lead: this lead already exists (id=%)', duplicate_id
        USING ERRCODE='23505', DETAIL='Duplicate customer and requirement within the same industry';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
