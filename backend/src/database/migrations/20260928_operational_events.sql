CREATE TABLE IF NOT EXISTS operational_events (
  id BIGSERIAL PRIMARY KEY,
  fingerprint VARCHAR(64) NOT NULL UNIQUE,
  source VARCHAR(20) NOT NULL CHECK (source IN ('backend','frontend','worker')),
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(12) NOT NULL CHECK (severity IN ('warning','error')),
  message VARCHAR(500) NOT NULL,
  route VARCHAR(300),
  method VARCHAR(10),
  status_code INTEGER CHECK (status_code IS NULL OR (status_code BETWEEN 100 AND 599)),
  duration_ms BIGINT CHECK (duration_ms IS NULL OR duration_ms >= 0),
  request_id VARCHAR(100),
  user_id BIGINT,
  user_role VARCHAR(40),
  build_commit VARCHAR(64),
  environment VARCHAR(30),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurrence_count BIGINT NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by BIGINT,
  resolution_note VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_operational_events_open
  ON operational_events(severity,last_seen_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_operational_events_last_seen
  ON operational_events(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_events_source_type
  ON operational_events(source,event_type,last_seen_at DESC);
