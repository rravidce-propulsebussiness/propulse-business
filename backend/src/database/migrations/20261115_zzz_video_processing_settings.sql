-- Admin switch for project video compression. Off by default: playback copies keep the
-- original picture and sound (H.264/AAC is copied bit-for-bit; other formats are converted
-- only so browsers can play them). When enabled, the video worker re-encodes new playback
-- copies to H.264 at the chosen maximum resolution and quality.
CREATE TABLE IF NOT EXISTS video_processing_settings (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  compress_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  max_resolution SMALLINT NOT NULL DEFAULT 1080 CHECK (max_resolution IN (720, 1080, 1440)),
  quality VARCHAR(12) NOT NULL DEFAULT 'balanced' CHECK (quality IN ('high', 'balanced', 'small')),
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO video_processing_settings(id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE video_processing_settings ENABLE ROW LEVEL SECURITY;
