CREATE TABLE IF NOT EXISTS lead_reports (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(40) NOT NULL CHECK (reason IN ('fake','wrong_number','not_interested','duplicate','other')),
  details TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified_fake','verified_genuine','rejected')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_reports_lead ON lead_reports(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_reports_reporter ON lead_reports(reporter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_reports_status ON lead_reports(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_reports_active_reporter_lead
  ON lead_reports(lead_id, reporter_user_id)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS lead_reporting_controls (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  can_report_leads BOOLEAN NOT NULL DEFAULT TRUE,
  false_report_count INTEGER NOT NULL DEFAULT 0 CHECK (false_report_count >= 0),
  restriction_reason TEXT,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_reporting_controls_can_report
  ON lead_reporting_controls(can_report_leads);
