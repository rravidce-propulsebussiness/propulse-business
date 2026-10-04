BEGIN;

CREATE TABLE IF NOT EXISTS sound_effect_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id=1),
  master_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  click_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  success_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  warning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  upload_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_volume NUMERIC(4,3) NOT NULL DEFAULT 0.200,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (default_volume >= 0 AND default_volume <= 0.500)
);

INSERT INTO sound_effect_settings(id)
VALUES(1)
ON CONFLICT(id) DO NOTHING;

COMMIT;
