CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(80) NOT NULL,
  category VARCHAR(24) NOT NULL CHECK (category IN ('payment','wallet','lead','membership','payout','security','system','sheet')),
  severity VARCHAR(16) NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','critical')),
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(500),
  related_type VARCHAR(60),
  related_id VARCHAR(120),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key VARCHAR(180),
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_dedupe
  ON notifications(user_id,dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id,created_at DESC,id DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id,created_at DESC)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id BIGSERIAL PRIMARY KEY,
  notification_id BIGINT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel VARCHAR(16) NOT NULL CHECK (channel IN ('email')),
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','retry','sent','failed','skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMP,
  last_error TEXT,
  provider_message_id VARCHAR(180),
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(notification_id,channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_pending
  ON notification_deliveries(status,next_attempt_at,created_at)
  WHERE status IN ('pending','retry','processing');
