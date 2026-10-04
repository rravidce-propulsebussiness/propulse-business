-- Retain all postal office names for a PIN so location resolution can match
-- a Propulse city/taluk even when the postal API's first record reports only
-- a district name.
ALTER TABLE india_pincodes
  ADD COLUMN IF NOT EXISTS office_names TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_india_pincodes_office_names
  ON india_pincodes USING GIN(office_names);