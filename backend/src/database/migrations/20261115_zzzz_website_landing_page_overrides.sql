CREATE TABLE IF NOT EXISTS website_landing_page_overrides (
  page_path TEXT PRIMARY KEY,
  seo_title VARCHAR(160) NOT NULL DEFAULT '',
  meta_description VARCHAR(500) NOT NULL DEFAULT '',
  hero_title VARCHAR(240) NOT NULL DEFAULT '',
  hero_summary VARCHAR(600) NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
