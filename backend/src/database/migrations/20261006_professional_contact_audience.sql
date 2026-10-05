-- Create an independent Professional contact audience without assuming legacy
-- contact rows were ever configured.

INSERT INTO contact_audience_settings (
  audience, company_name, email, phone, whatsapp, address, business_hours,
  support_email, careers_email, maps_url, website_url, social_handles
)
SELECT
  'professionals',
  company_name, email, phone, whatsapp, address, business_hours,
  support_email, careers_email, maps_url, '/professional-contact', social_handles
FROM contact_audience_settings
WHERE audience='users'
ON CONFLICT (audience) DO NOTHING;

INSERT INTO contact_audience_settings (
  audience, company_name, email, phone, whatsapp, address, business_hours,
  support_email, careers_email, maps_url, website_url, social_handles
)
SELECT
  'professionals',
  company_name, email, phone, whatsapp, address, business_hours,
  support_email, careers_email, maps_url, '/professional-contact', social_handles
FROM contact_audience_settings
WHERE audience='website'
  AND NOT EXISTS (SELECT 1 FROM contact_audience_settings WHERE audience='professionals')
ON CONFLICT (audience) DO NOTHING;

INSERT INTO contact_audience_settings (
  audience, company_name, email, phone, whatsapp, address, business_hours,
  support_email, careers_email, maps_url, website_url, social_handles
)
SELECT
  'professionals',
  company_name, email, phone, whatsapp, address, business_hours,
  support_email, careers_email, maps_url, '/professional-contact', social_handles
FROM contact_settings
WHERE id=1
  AND NOT EXISTS (SELECT 1 FROM contact_audience_settings WHERE audience='professionals')
ON CONFLICT (audience) DO NOTHING;

INSERT INTO contact_audience_settings (
  audience, company_name, email, phone, whatsapp, address, business_hours,
  support_email, careers_email, maps_url, website_url, social_handles
)
SELECT
  'professionals',
  '',
  '', '', '', '', '', '', '', '', '/professional-contact', '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM contact_audience_settings WHERE audience='professionals')
ON CONFLICT (audience) DO NOTHING;
