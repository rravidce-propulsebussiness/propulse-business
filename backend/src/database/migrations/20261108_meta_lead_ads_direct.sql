-- Meta Lead Ads is a direct intake channel. It never writes to Google Sheets.
CREATE TABLE IF NOT EXISTS meta_lead_connections (
  id BIGSERIAL PRIMARY KEY,
  page_id VARCHAR(40) NOT NULL UNIQUE,
  page_name VARCHAR(255) NOT NULL,
  owner_type VARCHAR(16) NOT NULL CHECK (owner_type IN ('admin','partner')),
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  encrypted_page_token TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disconnected')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_meta_lead_connections_owner
  ON meta_lead_connections(owner_type, owner_user_id, status);

CREATE TABLE IF NOT EXISTS meta_ads_leads (
  id BIGSERIAL PRIMARY KEY,
  connection_id BIGINT NOT NULL REFERENCES meta_lead_connections(id) ON DELETE RESTRICT,
  meta_leadgen_id VARCHAR(40) NOT NULL UNIQUE,
  page_id VARCHAR(40) NOT NULL,
  form_id VARCHAR(40),
  ad_id VARCHAR(40),
  adgroup_id VARCHAR(40),
  submitted_at TIMESTAMPTZ,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  lead_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','retry','received','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lease_until TIMESTAMPTZ,
  last_error VARCHAR(250),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_meta_ads_leads_queue
  ON meta_ads_leads(next_attempt_at,id) WHERE status IN ('pending','retry');
CREATE INDEX IF NOT EXISTS idx_meta_ads_leads_connection
  ON meta_ads_leads(connection_id,created_at DESC);

-- These tables contain Page credentials and customer contact details.
-- Supabase Data API roles must never be able to access them directly.
ALTER TABLE meta_lead_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ads_leads ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON TABLE meta_lead_connections,meta_ads_leads FROM anon;
    REVOKE ALL ON SEQUENCE meta_lead_connections_id_seq,meta_ads_leads_id_seq FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON TABLE meta_lead_connections,meta_ads_leads FROM authenticated;
    REVOKE ALL ON SEQUENCE meta_lead_connections_id_seq,meta_ads_leads_id_seq FROM authenticated;
  END IF;
END
$$;
