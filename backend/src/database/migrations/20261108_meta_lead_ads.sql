-- Meta (Facebook/Instagram) Lead Ads as a real-time lead source for admin and
-- lead partners. Meta pushes a webhook per new lead; no polling job exists.

-- This replaces an earlier direct Meta integration (PRs #507/#508) whose
-- migration already ran in production and created a different
-- meta_lead_connections table. Keep its data, but move it out of the way.
DO $$
BEGIN
  IF to_regclass('public.meta_lead_connections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='meta_lead_connections' AND column_name='meta_page_id'
     ) THEN
    ALTER TABLE meta_lead_connections RENAME TO meta_lead_connections_legacy_direct;
  END IF;
  IF to_regclass('public.meta_ads_leads') IS NOT NULL THEN
    ALTER TABLE meta_ads_leads RENAME TO meta_ads_leads_legacy_direct;
  END IF;
END $$;

-- Facebook Pages an owner authorised through Facebook Login. Page access
-- tokens are encrypted at rest (AES-256-GCM, META_TOKEN_ENCRYPTION_KEY).
CREATE TABLE IF NOT EXISTS meta_lead_pages (
  id SERIAL PRIMARY KEY,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_scope VARCHAR(20) NOT NULL CHECK (owner_scope IN ('admin','lead_partner')),
  page_id VARCHAR(40) NOT NULL,
  page_name VARCHAR(255) NOT NULL DEFAULT '',
  page_token_encrypted TEXT NOT NULL,
  meta_user_id VARCHAR(40),
  authorized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (owner_user_id, owner_scope, page_id)
);

-- One lead form imported into one owner's leads, with the same column
-- mapping and default industry model as Google Sheet connections.
CREATE TABLE IF NOT EXISTS meta_lead_connections (
  id SERIAL PRIMARY KEY,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_scope VARCHAR(20) NOT NULL CHECK (owner_scope IN ('admin','lead_partner')),
  meta_page_id INTEGER NOT NULL REFERENCES meta_lead_pages(id) ON DELETE CASCADE,
  page_id VARCHAR(40) NOT NULL,
  form_id VARCHAR(40) NOT NULL,
  form_name VARCHAR(255) NOT NULL DEFAULT '',
  column_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_industry_id INTEGER REFERENCES industries(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  leads_received INTEGER NOT NULL DEFAULT 0,
  leads_created INTEGER NOT NULL DEFAULT 0,
  leads_duplicate INTEGER NOT NULL DEFAULT 0,
  leads_failed INTEGER NOT NULL DEFAULT 0,
  last_lead_at TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A form may feed exactly one active owner, so a lead is never imported twice.
CREATE UNIQUE INDEX IF NOT EXISTS meta_lead_connections_active_form_uidx
  ON meta_lead_connections(form_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS meta_lead_connections_owner_idx
  ON meta_lead_connections(owner_user_id, owner_scope, status);

-- Idempotency and audit for every lead Meta announces (webhook or backfill).
CREATE TABLE IF NOT EXISTS meta_lead_events (
  leadgen_id VARCHAR(40) PRIMARY KEY,
  connection_id INTEGER REFERENCES meta_lead_connections(id) ON DELETE SET NULL,
  page_id VARCHAR(40),
  form_id VARCHAR(40),
  status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received','imported','duplicate','failed','ignored')),
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS meta_lead_events_connection_idx
  ON meta_lead_events(connection_id, received_at DESC);
