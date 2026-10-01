CREATE TABLE IF NOT EXISTS background_worker_heartbeats (
  worker_name VARCHAR(100) NOT NULL,
  instance_id UUID NOT NULL,
  hostname VARCHAR(255),
  pid INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running','stopped')),
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(worker_name,instance_id)
);

CREATE INDEX IF NOT EXISTS idx_background_worker_heartbeats_fresh
  ON background_worker_heartbeats(worker_name,status,last_seen_at DESC);
