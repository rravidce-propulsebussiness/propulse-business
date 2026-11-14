-- Configurable Basic / Premium classification from captured form answers.
CREATE TABLE IF NOT EXISTS lead_classification_settings (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  match_mode VARCHAR(8) NOT NULL DEFAULT 'all' CHECK (match_mode IN ('all','any')),
  premium_conditions JSONB NOT NULL DEFAULT '[{"field":"Plot Size","operator":"gt","value":"150","fieldType":"number"},{"field":"Floors","operator":"gt","value":"G+3","fieldType":"floors"}]'::jsonb,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO lead_classification_settings(id,enabled,match_mode,premium_conditions)
VALUES(1,TRUE,'all','[{"field":"Plot Size","operator":"gt","value":"150","fieldType":"number"},{"field":"Floors","operator":"gt","value":"G+3","fieldType":"floors"}]'::jsonb)
ON CONFLICT(id) DO NOTHING;
