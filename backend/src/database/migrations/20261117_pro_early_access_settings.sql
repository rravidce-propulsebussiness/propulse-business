ALTER TABLE lead_access_settings
  ADD COLUMN IF NOT EXISTS pro_early_access_days INTEGER NOT NULL DEFAULT 1
    CHECK (pro_early_access_days BETWEEN 1 AND 365);

UPDATE lead_access_settings
SET pro_early_access_days = 2
WHERE lead_type = 'premium';
