CREATE TABLE IF NOT EXISTS background_job_runs (
  id BIGSERIAL PRIMARY KEY,
  job_key VARCHAR(100) NOT NULL,
  trigger_source VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (trigger_source IN ('scheduled','manual','startup')),
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('running','succeeded','failed','skipped')),
  triggered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_background_job_runs_job_started
  ON background_job_runs(job_key,started_at DESC,id DESC);

CREATE INDEX IF NOT EXISTS idx_background_job_runs_status_started
  ON background_job_runs(status,started_at DESC);
