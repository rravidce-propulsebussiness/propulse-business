BEGIN;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS access_strategy VARCHAR(32) NOT NULL DEFAULT 'shared';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS release_to_two_after_hours INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS release_to_three_after_hours INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS access_capacity_locked INTEGER;

UPDATE leads
SET buyer_capacity=LEAST(3,GREATEST(1,COALESCE(buyer_capacity,3))),
    custom_fields=jsonb_set(
      COALESCE(custom_fields,'{}'::jsonb),
      '{buyerCapacity}',
      to_jsonb(LEAST(3,GREATEST(1,COALESCE(buyer_capacity,3)))),
      TRUE
    )
WHERE buyer_capacity IS NULL OR buyer_capacity<1 OR buyer_capacity>3;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_buyer_capacity_check;
ALTER TABLE leads ADD CONSTRAINT leads_buyer_capacity_check CHECK (buyer_capacity BETWEEN 1 AND 3);
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_access_strategy_check;
ALTER TABLE leads ADD CONSTRAINT leads_access_strategy_check CHECK (access_strategy IN ('permanent_single','auto_release','shared'));
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_access_locked_check;
ALTER TABLE leads ADD CONSTRAINT leads_access_locked_check CHECK (access_capacity_locked IS NULL OR access_capacity_locked BETWEEN 1 AND 3);
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_release_hours_check;
ALTER TABLE leads ADD CONSTRAINT leads_release_hours_check CHECK (
  (release_to_two_after_hours IS NULL OR release_to_two_after_hours>=0)
  AND (release_to_three_after_hours IS NULL OR release_to_three_after_hours>=0)
  AND (
    release_to_two_after_hours IS NULL
    OR release_to_three_after_hours IS NULL
    OR release_to_three_after_hours>=release_to_two_after_hours
  )
);

CREATE TABLE IF NOT EXISTS lead_access_settings (
  lead_type VARCHAR(20) PRIMARY KEY CHECK (lead_type IN ('basic','premium')),
  default_strategy VARCHAR(32) NOT NULL DEFAULT 'auto_release' CHECK (default_strategy IN ('permanent_single','auto_release','shared')),
  max_buyer_capacity INTEGER NOT NULL DEFAULT 3 CHECK (max_buyer_capacity BETWEEN 1 AND 3),
  release_to_two_after_hours INTEGER,
  release_to_three_after_hours INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (release_to_two_after_hours IS NULL OR release_to_two_after_hours>=0)
    AND (release_to_three_after_hours IS NULL OR release_to_three_after_hours>=0)
    AND (
      release_to_two_after_hours IS NULL
      OR release_to_three_after_hours IS NULL
      OR release_to_three_after_hours>=release_to_two_after_hours
    )
  )
);

INSERT INTO lead_access_settings(lead_type,default_strategy,max_buyer_capacity,release_to_two_after_hours,release_to_three_after_hours)
VALUES
  ('basic','auto_release',3,24,48),
  ('premium','auto_release',3,48,96)
ON CONFLICT(lead_type) DO NOTHING;

CREATE OR REPLACE FUNCTION sync_lead_buyer_capacity()
RETURNS TRIGGER AS $$
DECLARE requested_capacity INTEGER;
BEGIN
  requested_capacity := NULLIF(TRIM(COALESCE(NEW.custom_fields->>'buyerCapacity', NEW.custom_fields->>'buyer_capacity', '')), '')::INTEGER;
  IF requested_capacity IS NOT NULL THEN
    IF requested_capacity < 1 OR requested_capacity > 3 THEN
      RAISE EXCEPTION 'buyerCapacity must be between 1 and 3';
    END IF;
    NEW.buyer_capacity := requested_capacity;
  ELSE
    NEW.buyer_capacity := LEAST(3,GREATEST(1,COALESCE(NEW.buyer_capacity,3)));
  END IF;
  IF NEW.access_strategy='permanent_single' THEN
    NEW.buyer_capacity := 1;
  END IF;
  RETURN NEW;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION 'buyerCapacity must be a whole number between 1 and 3';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION lead_effective_buyer_capacity(
  strategy TEXT,
  max_capacity INTEGER,
  release_two_hours INTEGER,
  release_three_hours INTEGER,
  lead_created_at TIMESTAMP,
  locked_capacity INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  cap INTEGER := LEAST(3,GREATEST(1,COALESCE(max_capacity,3)));
  age_hours NUMERIC;
BEGIN
  IF locked_capacity IS NOT NULL THEN
    RETURN LEAST(cap,LEAST(3,GREATEST(1,locked_capacity)));
  END IF;
  IF COALESCE(strategy,'shared')='permanent_single' THEN
    RETURN 1;
  END IF;
  IF COALESCE(strategy,'shared')='shared' THEN
    RETURN cap;
  END IF;
  age_hours := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-COALESCE(lead_created_at,CURRENT_TIMESTAMP)))/3600.0;
  IF cap>=3 AND release_three_hours IS NOT NULL AND age_hours>=release_three_hours THEN RETURN 3; END IF;
  IF cap>=2 AND release_two_hours IS NOT NULL AND age_hours>=release_two_hours THEN RETURN 2; END IF;
  RETURN 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;
