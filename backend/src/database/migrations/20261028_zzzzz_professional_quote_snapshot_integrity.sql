-- Preserve every published package detail shown on a submitted indicative quote.
-- Existing quote requests retain their original rate/unit/specification snapshots.
BEGIN;
ALTER TABLE professional_project_quote_requests
  ADD COLUMN IF NOT EXISTS package_description_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS package_duration_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS package_inclusions_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb;
COMMIT;
