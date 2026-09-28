CREATE TABLE IF NOT EXISTS background_job_leases (
  job_key VARCHAR(100) PRIMARY KEY,
  owner_token UUID NOT NULL,
  locked_until TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_background_job_leases_expiry
  ON background_job_leases(locked_until);
