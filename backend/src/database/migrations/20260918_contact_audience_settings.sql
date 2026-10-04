-- This migration can run before 20260918_contact_settings.sql on a fresh database.
-- Establish the dependency shape first; the dedicated migration remains idempotent.
CREATE TABLE IF NOT EXISTS contact_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  company_name VARCHAR(200) NOT NULL DEFAULT 'ProPulse Business Private Limited',
  email VARCHAR(200) NOT NULL DEFAULT '',
  phone VARCHAR(60) NOT NULL DEFAULT '',
  whatsapp VARCHAR(60) NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  business_hours VARCHAR(200) NOT NULL DEFAULT '',
  support_email VARCHAR(200) NOT NULL DEFAULT '',
  careers_email VARCHAR(200) NOT NULL DEFAULT '',
  maps_url TEXT NOT NULL DEFAULT '',
  website_url TEXT NOT NULL DEFAULT '',
  social_handles JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_audience_settings (
  id SERIAL PRIMARY KEY,
  audience VARCHAR(40) NOT NULL UNIQUE,
  company_name VARCHAR(200) NOT NULL DEFAULT '',
  email VARCHAR(200) NOT NULL DEFAULT '',
  phone VARCHAR(60) NOT NULL DEFAULT '',
  whatsapp VARCHAR(60) NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  business_hours VARCHAR(200) NOT NULL DEFAULT '',
  support_email VARCHAR(200) NOT NULL DEFAULT '',
  careers_email VARCHAR(200) NOT NULL DEFAULT '',
  maps_url TEXT NOT NULL DEFAULT '/',
  website_url TEXT NOT NULL DEFAULT '/',
  social_handles JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO contact_audience_settings (
  audience, company_name, email, phone, whatsapp, address, business_hours,
  support_email, careers_email, maps_url, website_url, social_handles
)
SELECT
  audience,
  company_name, email, phone, whatsapp, address, business_hours,
  support_email, careers_email, maps_url, website_url, social_handles
FROM (
  SELECT
    c.*,
    a.audience
  FROM contact_settings c
  CROSS JOIN (VALUES ('website'),('users'),('lead_partners'),('common')) AS a(audience)
  WHERE c.id=1
) seeded
ON CONFLICT (audience) DO NOTHING;