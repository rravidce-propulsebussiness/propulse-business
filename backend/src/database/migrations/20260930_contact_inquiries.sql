CREATE TABLE IF NOT EXISTS contact_inquiries (
  id BIGSERIAL PRIMARY KEY,
  submission_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  interest VARCHAR(40) NOT NULL DEFAULT 'general',
  city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
  city_name VARCHAR(160) NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','closed')),
  source VARCHAR(60) NOT NULL DEFAULT 'website_contact',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status_created
  ON contact_inquiries(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_city
  ON contact_inquiries(city_id, created_at DESC);
