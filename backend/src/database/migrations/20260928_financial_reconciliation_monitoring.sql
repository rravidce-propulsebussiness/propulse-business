CREATE TABLE IF NOT EXISTS financial_reconciliation_runs (
  id BIGSERIAL PRIMARY KEY,
  source VARCHAR(40) NOT NULL DEFAULT 'scheduled',
  status VARCHAR(20) NOT NULL CHECK (status IN ('running','clean','warning','critical','failed')),
  critical_count INTEGER NOT NULL DEFAULT 0 CHECK (critical_count >= 0),
  warning_count INTEGER NOT NULL DEFAULT 0 CHECK (warning_count >= 0),
  total_issue_count INTEGER NOT NULL DEFAULT 0 CHECK (total_issue_count >= 0),
  check_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  overview JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  build_commit VARCHAR(64),
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_financial_reconciliation_runs_completed
  ON financial_reconciliation_runs(completed_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS admin_operational_alerts (
  id BIGSERIAL PRIMARY KEY,
  alert_key VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning','critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved')),
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_admin_operational_alert_key UNIQUE(alert_key)
);

CREATE INDEX IF NOT EXISTS idx_admin_operational_alerts_active
  ON admin_operational_alerts(category,status,severity,last_seen_at DESC);
