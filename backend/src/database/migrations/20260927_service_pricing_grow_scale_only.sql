BEGIN;

DELETE FROM service_pricing
WHERE category NOT IN ('Grow','Scale');

UPDATE service_pricing
SET category='Grow'
WHERE category IS NULL OR BTRIM(category)='';

ALTER TABLE service_pricing
  DROP CONSTRAINT IF EXISTS service_pricing_category_check;

ALTER TABLE service_pricing
  ADD CONSTRAINT service_pricing_category_check
  CHECK (category IN ('Grow','Scale'));

COMMIT;
