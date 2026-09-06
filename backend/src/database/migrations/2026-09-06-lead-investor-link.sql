BEGIN;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS investor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_investor_user ON leads(investor_user_id);

COMMIT;
