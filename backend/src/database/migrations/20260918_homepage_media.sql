CREATE TABLE IF NOT EXISTS homepage_media_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id=1),
  hero_image_url TEXT NOT NULL DEFAULT '',
  category_images JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO homepage_media_settings(id,hero_image_url,category_images)
VALUES(1,'','{}'::jsonb)
ON CONFLICT(id) DO NOTHING;