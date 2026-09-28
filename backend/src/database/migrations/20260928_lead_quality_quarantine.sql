ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('available','paused','sold','closed','invalid','quarantined'));

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS quality_gate_score NUMERIC(5,2)
    CHECK (quality_gate_score IS NULL OR (quality_gate_score >= 0 AND quality_gate_score <= 100)),
  ADD COLUMN IF NOT EXISTS quality_gate_status VARCHAR(24) NOT NULL DEFAULT 'not_checked'
    CHECK (quality_gate_status IN ('not_checked','passed','quarantined','overridden')),
  ADD COLUMN IF NOT EXISTS quality_gate_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quality_gate_checked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS quality_gate_context VARCHAR(32),
  ADD COLUMN IF NOT EXISTS quality_gate_reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quality_gate_reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS quality_gate_note TEXT;

CREATE TABLE IF NOT EXISTS lead_quality_gate_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id=1),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  minimum_score NUMERIC(5,2) NOT NULL DEFAULT 70
    CHECK (minimum_score >= 0 AND minimum_score <= 100),
  require_contact BOOLEAN NOT NULL DEFAULT TRUE,
  require_valid_contact BOOLEAN NOT NULL DEFAULT TRUE,
  require_valid_pincode BOOLEAN NOT NULL DEFAULT TRUE,
  require_pincode_city_match BOOLEAN NOT NULL DEFAULT TRUE,
  require_classification_valid BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO lead_quality_gate_settings(id)
VALUES(1)
ON CONFLICT(id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_leads_quarantined_created
  ON leads(created_at DESC,id DESC)
  WHERE status='quarantined';

CREATE INDEX IF NOT EXISTS idx_leads_quality_gate_status
  ON leads(quality_gate_status,quality_gate_checked_at DESC);
