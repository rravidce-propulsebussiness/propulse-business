ALTER TABLE homepage_media_settings
  ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE homepage_media_settings
   SET content='{}'::jsonb
 WHERE content IS NULL;
