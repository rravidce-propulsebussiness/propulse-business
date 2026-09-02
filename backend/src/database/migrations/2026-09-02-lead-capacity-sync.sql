BEGIN;

CREATE OR REPLACE FUNCTION sync_lead_buyer_capacity()
RETURNS TRIGGER AS $$
DECLARE requested_capacity INTEGER;
BEGIN
  requested_capacity := NULLIF(TRIM(COALESCE(NEW.custom_fields->>'buyerCapacity', NEW.custom_fields->>'buyer_capacity', '')), '')::INTEGER;
  IF requested_capacity IS NOT NULL AND requested_capacity > 0 THEN
    NEW.buyer_capacity := requested_capacity;
  END IF;
  RETURN NEW;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION 'buyerCapacity must be a positive integer';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_lead_buyer_capacity ON leads;
CREATE TRIGGER trg_sync_lead_buyer_capacity
BEFORE INSERT OR UPDATE OF custom_fields,buyer_capacity ON leads
FOR EACH ROW EXECUTE FUNCTION sync_lead_buyer_capacity();

COMMIT;
