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

INSERT INTO contact_settings (
  id, company_name, email, phone, whatsapp, address, business_hours,
  support_email, careers_email, maps_url, website_url, social_handles
)
SELECT
  1,
  'ProPulse Business Private Limited',
  'info@propulse.com',
  '+91 98765 43210',
  '+91 98765 43210',
  'Hitech City, Hyderabad, Telangana - 500081, India',
  'Mon - Sat, 9:00 AM - 6:00 PM',
  'support@propulse.com',
  'careers@propulse.com',
  'https://maps.google.com/?q=Hitech+City,+Hyderabad',
  '/',
  '[{"id":"facebook","platform":"Facebook","url":"","enabled":true},{"id":"instagram","platform":"Instagram","url":"","enabled":true},{"id":"linkedin","platform":"LinkedIn","url":"","enabled":true},{"id":"youtube","platform":"YouTube","url":"","enabled":true}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM contact_settings WHERE id=1);