ALTER TABLE leads ADD COLUMN IF NOT EXISTS subcity_id INTEGER REFERENCES subcities(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pincode VARCHAR(6);

CREATE INDEX IF NOT EXISTS idx_leads_subcity ON leads(subcity_id);
CREATE INDEX IF NOT EXISTS idx_leads_pincode ON leads(pincode);

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_pincode_format;
ALTER TABLE leads ADD CONSTRAINT leads_pincode_format CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$');
