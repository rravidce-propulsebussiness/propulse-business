CREATE TABLE IF NOT EXISTS security_auth_attempts (
  id BIGSERIAL PRIMARY KEY,
  subject_hash CHAR(64) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  source_hash CHAR(64),
  succeeded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_auth_attempts_subject_recent
  ON security_auth_attempts(subject_hash,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_auth_attempts_user_recent
  ON security_auth_attempts(user_id,created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_security_auth_attempts_retention
  ON security_auth_attempts(created_at);

CREATE TABLE IF NOT EXISTS security_risk_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(80) NOT NULL,
  event_key VARCHAR(180) NOT NULL,
  severity VARCHAR(16) NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  related_type VARCHAR(50),
  related_id BIGINT,
  title VARCHAR(180) NOT NULL,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count >= 1),
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  review_note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_security_risk_events_open_key
  ON security_risk_events(event_type,event_key)
  WHERE status='open';

CREATE INDEX IF NOT EXISTS idx_security_risk_events_open
  ON security_risk_events(status,severity,last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_risk_events_user
  ON security_risk_events(user_id,last_seen_at DESC)
  WHERE user_id IS NOT NULL;
