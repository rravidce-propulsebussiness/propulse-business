CREATE TABLE IF NOT EXISTS lead_partners (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','rejected')),
    quality_score NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (quality_score >= 0 AND quality_score <= 100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_partners_status ON lead_partners(status);
CREATE INDEX IF NOT EXISTS idx_lead_partners_created_at ON lead_partners(created_at DESC);

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS lead_partner_id INTEGER REFERENCES lead_partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_lead_partner_id ON leads(lead_partner_id);
