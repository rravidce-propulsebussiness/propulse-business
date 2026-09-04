CREATE TABLE IF NOT EXISTS india_pincodes (
  pincode VARCHAR(6) PRIMARY KEY,
  state_id INTEGER REFERENCES states(id) ON DELETE SET NULL,
  state_name VARCHAR(100) NOT NULL,
  district_name VARCHAR(120),
  office_count INTEGER NOT NULL DEFAULT 0 CHECK (office_count >= 0),
  source VARCHAR(80) NOT NULL DEFAULT 'pincodeapi-india-post',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (pincode ~ '^[0-9]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_india_pincodes_state ON india_pincodes(state_id);
CREATE INDEX IF NOT EXISTS idx_india_pincodes_state_name ON india_pincodes(LOWER(state_name));
CREATE INDEX IF NOT EXISTS idx_india_pincodes_district ON india_pincodes(LOWER(district_name));
