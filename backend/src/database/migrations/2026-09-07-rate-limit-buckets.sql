-- Shared rate-limit state for multi-instance production deployments.
-- Development keeps the existing in-memory limiter so local work does not require a database.
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMP NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_updated_at
  ON rate_limit_buckets(updated_at);
