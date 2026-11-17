-- Keep Pro Early Access a stricter tier above Premium.
ALTER TABLE lead_classification_settings
  ADD COLUMN IF NOT EXISTS exclusive_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exclusive_match_mode VARCHAR(8) NOT NULL DEFAULT 'all'
    CHECK (exclusive_match_mode IN ('all','any')),
  ADD COLUMN IF NOT EXISTS exclusive_conditions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE lead_classification_industry_settings
  ADD COLUMN IF NOT EXISTS exclusive_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS exclusive_match_mode VARCHAR(8) NOT NULL DEFAULT 'all'
    CHECK (exclusive_match_mode IN ('all','any')),
  ADD COLUMN IF NOT EXISTS exclusive_conditions JSONB NOT NULL DEFAULT '[]'::jsonb;
