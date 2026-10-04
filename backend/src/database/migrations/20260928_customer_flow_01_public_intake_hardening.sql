-- Phase 1: public requirement intake hardening.
-- Keep the canonical leads table and replace lifetime duplicate blocking with
-- a short accidental-resubmission window scoped to the same lead category.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS contact_consent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS contact_consent_version VARCHAR(80),
  ADD COLUMN IF NOT EXISTS intake_submission_key VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_intake_submission_key
  ON leads(intake_submission_key)
  WHERE intake_submission_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_public_intake_created
  ON leads(source, created_at DESC)
  WHERE intake_submission_key IS NOT NULL;

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

DROP TRIGGER IF EXISTS trg_prevent_duplicate_lead_insert ON leads;
CREATE TRIGGER trg_prevent_duplicate_lead_insert
BEFORE INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_lead_insert();
