BEGIN;

DELETE FROM service_pricing
WHERE category NOT IN ('Grow','Scale');

UPDATE service_pricing
SET category='Grow'
WHERE category IS NULL OR BTRIM(category)='';

COMMIT;
