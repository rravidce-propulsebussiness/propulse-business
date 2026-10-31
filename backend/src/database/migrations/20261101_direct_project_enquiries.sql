-- First-party ProPulse enquiries must never be inserted into the paid lead marketplace.
-- Only the admin account can retrieve and manage these records.
CREATE TABLE IF NOT EXISTS propulse_direct_project_enquiries (
  id BIGSERIAL PRIMARY KEY,
  submission_key VARCHAR(100) NOT NULL UNIQUE,
  customer_name VARCHAR(160) NOT NULL,
  customer_phone VARCHAR(16) NOT NULL,
  customer_email VARCHAR(255),
  service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('construction','interiors')),
  project_location VARCHAR(160) NOT NULL,
  requirement TEXT NOT NULL,
  contact_consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','site_visit','quoted','won','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_propulse_direct_project_enquiries_admin
  ON propulse_direct_project_enquiries (created_at DESC, id DESC);
