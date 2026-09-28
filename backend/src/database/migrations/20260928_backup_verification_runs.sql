CREATE TABLE IF NOT EXISTS backup_verification_runs (
  id BIGSERIAL PRIMARY KEY,
  backup_type VARCHAR(40) NOT NULL CHECK (backup_type IN ('database','private_storage')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('verified','failed')),
  artifact_name VARCHAR(255),
  artifact_sha256 CHAR(64),
  artifact_size_bytes BIGINT,
  build_commit VARCHAR(64),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backup_verification_runs_latest
  ON backup_verification_runs(backup_type,completed_at DESC,id DESC);
