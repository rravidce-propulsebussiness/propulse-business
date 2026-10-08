BEGIN;
CREATE TABLE IF NOT EXISTS professional_project_quote_requests (
  id BIGSERIAL PRIMARY KEY,
  project_id INTEGER,
  project_title VARCHAR(180) NOT NULL,
  business_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name VARCHAR(160) NOT NULL,
  customer_phone VARCHAR(16) NOT NULL,
  customer_email VARCHAR(255),
  requirement TEXT NOT NULL,
  site_location VARCHAR(180),
  area_text VARCHAR(120),
  budget_text VARCHAR(120),
  preferred_package VARCHAR(160),
  status VARCHAR(24) NOT NULL DEFAULT 'new' CHECK(status IN ('new','in_review','quoted','closed')),
  quoted_package VARCHAR(160),
  quoted_price NUMERIC(12,2),
  quoted_scope TEXT,
  professional_notes TEXT,
  quoted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quote_price_valid CHECK(quoted_price IS NULL OR quoted_price>0)
);
CREATE INDEX IF NOT EXISTS idx_professional_quote_owner
 ON professional_project_quote_requests(business_user_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_professional_quote_duplicate
 ON professional_project_quote_requests(project_id,customer_phone,created_at DESC);
COMMIT;
