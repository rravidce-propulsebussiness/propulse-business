BEGIN;

-- Buyer capacity is a business rule, not merely a UI validation. Normalize
-- legacy values before enforcing the minimum so direct SQL cannot reintroduce 1.
UPDATE leads
SET buyer_capacity=3,
    custom_fields=jsonb_set(
      COALESCE(custom_fields,'{}'::jsonb),
      '{buyerCapacity}',
      '3'::jsonb,
      TRUE
    ),
    updated_at=CURRENT_TIMESTAMP
WHERE buyer_capacity < 2
   OR buyer_capacity IS NULL;

CREATE OR REPLACE FUNCTION sync_lead_buyer_capacity()
RETURNS TRIGGER AS $$
DECLARE requested_capacity INTEGER;
BEGIN
  requested_capacity := NULLIF(TRIM(COALESCE(NEW.custom_fields->>'buyerCapacity', NEW.custom_fields->>'buyer_capacity', '')), '')::INTEGER;
  IF requested_capacity IS NOT NULL THEN
    IF requested_capacity < 2 THEN
      RAISE EXCEPTION 'buyerCapacity must be at least 2';
    END IF;
    NEW.buyer_capacity := requested_capacity;
  ELSE
    NEW.buyer_capacity := GREATEST(COALESCE(NEW.buyer_capacity,3),2);
  END IF;
  RETURN NEW;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION 'buyerCapacity must be a whole number of at least 2';
END;
$$ LANGUAGE plpgsql;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_buyer_capacity_check;
ALTER TABLE leads ADD CONSTRAINT leads_buyer_capacity_check CHECK (buyer_capacity >= 2);

COMMIT;
