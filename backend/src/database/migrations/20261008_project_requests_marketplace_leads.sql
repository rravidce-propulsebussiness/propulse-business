-- Link project-specific customer requests with one priced, quality-gated marketplace lead.
-- Existing records predate the new multi-professional consent and are not automatically shared.
ALTER TABLE professional_project_quote_requests
  ADD COLUMN IF NOT EXISTS marketplace_pincode VARCHAR(6),
  ADD COLUMN IF NOT EXISTS marketplace_lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS marketplace_sync_status VARCHAR(24) NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS marketplace_sync_error VARCHAR(255);
ALTER TABLE project_callback_requests
  ADD COLUMN IF NOT EXISTS marketplace_pincode VARCHAR(6),
  ADD COLUMN IF NOT EXISTS marketplace_lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS marketplace_sync_status VARCHAR(24) NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS marketplace_sync_error VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_professional_project_quote_marketplace_sync
  ON professional_project_quote_requests(marketplace_sync_status, id)
  WHERE marketplace_sync_status IN ('pending', 'review_required');
CREATE INDEX IF NOT EXISTS idx_project_callback_marketplace_sync
  ON project_callback_requests(marketplace_sync_status, id)
  WHERE marketplace_sync_status IN ('pending', 'review_required');
