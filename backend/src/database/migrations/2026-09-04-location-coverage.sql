ALTER TABLE cities ADD COLUMN IF NOT EXISTS location_sync_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS city_pincodes (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  pincode VARCHAR(6) NOT NULL,
  office_name VARCHAR(160),
  source VARCHAR(80) NOT NULL DEFAULT 'india-post-open-api',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(city_id,pincode,office_name)
);
CREATE INDEX IF NOT EXISTS idx_city_pincodes_city ON city_pincodes(city_id);

CREATE TABLE IF NOT EXISTS subcities (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  pincode VARCHAR(6),
  source VARCHAR(80) NOT NULL DEFAULT 'openstreetmap',
  external_id VARCHAR(180),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(city_id,slug)
);
CREATE INDEX IF NOT EXISTS idx_subcities_city ON subcities(city_id);

ALTER TABLE business_profile_locations ADD COLUMN IF NOT EXISTS subcity_id INTEGER REFERENCES subcities(id) ON DELETE SET NULL;
ALTER TABLE business_profile_locations ADD COLUMN IF NOT EXISTS pincode VARCHAR(6);
CREATE INDEX IF NOT EXISTS idx_business_profile_locations_subcity ON business_profile_locations(subcity_id);
