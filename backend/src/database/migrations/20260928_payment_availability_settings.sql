CREATE TABLE IF NOT EXISTS payment_availability_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id=1),
  offline_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  online_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  online_display_mode VARCHAR(20) NOT NULL DEFAULT 'coming_soon'
    CHECK (online_display_mode IN ('live','coming_soon','hidden')),
  online_label VARCHAR(80) NOT NULL DEFAULT 'Pay Online',
  online_coming_soon_message VARCHAR(220) NOT NULL DEFAULT 'Online payment is coming soon.',
  offline_label VARCHAR(80) NOT NULL DEFAULT 'UPI / Bank Transfer',
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO payment_availability_settings(id)
VALUES(1)
ON CONFLICT(id) DO NOTHING;
