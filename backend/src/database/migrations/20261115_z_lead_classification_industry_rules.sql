-- Allow each lead industry to use its own configurable Basic / Premium rules.
CREATE TABLE IF NOT EXISTS lead_classification_industry_settings (
  industry_id INTEGER PRIMARY KEY REFERENCES industries(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  match_mode VARCHAR(8) NOT NULL DEFAULT 'all' CHECK (match_mode IN ('all','any')),
  premium_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Carry the existing construction criteria into the Construction industry so
-- interior and other industries can be configured independently.
INSERT INTO lead_classification_industry_settings
  (industry_id,enabled,match_mode,premium_conditions,updated_by,updated_at)
SELECT i.id,s.enabled,s.match_mode,s.premium_conditions,s.updated_by,s.updated_at
FROM industries i
CROSS JOIN lead_classification_settings s
WHERE s.id=1 AND LOWER(i.name)='construction'
ON CONFLICT(industry_id) DO NOTHING;

-- The original defaults describe construction leads. Keep them there and make
-- the all-industries fallback neutral unless an admin had already customized it.
UPDATE lead_classification_settings
SET premium_conditions='[]'::jsonb,updated_at=CURRENT_TIMESTAMP
WHERE id=1
  AND premium_conditions='[{"field":"Plot Size","operator":"gt","value":"150","fieldType":"number"},{"field":"Floors","operator":"gt","value":"G+3","fieldType":"floors"}]'::jsonb;
