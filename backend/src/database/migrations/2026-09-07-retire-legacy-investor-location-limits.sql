BEGIN;

-- The original location-only investor rules were superseded by the
-- hierarchical industry -> state -> city rules in
-- investor_industry_location_limits. Keep the historical migration intact,
-- but remove the obsolete runtime table so there is only one source of truth.
DROP TABLE IF EXISTS investor_location_limits;

COMMIT;
