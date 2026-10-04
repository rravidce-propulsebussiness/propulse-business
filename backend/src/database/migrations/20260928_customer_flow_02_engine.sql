-- Phase 1: reusable versioned customer requirement / estimator question engine.
-- Estimator calculation/rate tables are intentionally deferred to Phase 2.

CREATE TABLE IF NOT EXISTS customer_flow_definitions (
  id SERIAL PRIMARY KEY,
  key VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  flow_type VARCHAR(30) NOT NULL DEFAULT 'requirement'
    CHECK (flow_type IN ('requirement','estimator')),
  industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE RESTRICT,
  service_id INTEGER REFERENCES services(id) ON DELETE RESTRICT,
  subservice_id INTEGER REFERENCES subservices(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (key ~ '^[a-z0-9][a-z0-9-]{1,79}$')
);

CREATE INDEX IF NOT EXISTS idx_customer_flow_definitions_scope
  ON customer_flow_definitions(industry_id, service_id, subservice_id, is_active);

CREATE TABLE IF NOT EXISTS customer_flow_versions (
  id SERIAL PRIMARY KEY,
  definition_id INTEGER NOT NULL REFERENCES customer_flow_definitions(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL CHECK (version_no > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','retired')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMP,
  published_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(definition_id, version_no)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_flow_one_published
  ON customer_flow_versions(definition_id)
  WHERE status='published';

CREATE INDEX IF NOT EXISTS idx_customer_flow_versions_definition
  ON customer_flow_versions(definition_id, version_no DESC);

CREATE TABLE IF NOT EXISTS customer_flow_questions (
  id SERIAL PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES customer_flow_versions(id) ON DELETE CASCADE,
  question_key VARCHAR(80) NOT NULL,
  question_type VARCHAR(30) NOT NULL
    CHECK (question_type IN (
      'single_select','multi_select','text','number','area',
      'budget','timeline','boolean','location'
    )),
  label VARCHAR(240) NOT NULL,
  help_text TEXT,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  show_when JSONB NOT NULL DEFAULT '{}'::jsonb,
  lead_field VARCHAR(40)
    CHECK (lead_field IS NULL OR lead_field IN ('requirement','property_type','budget')),
  visibility VARCHAR(20) NOT NULL DEFAULT 'marketplace'
    CHECK (visibility IN ('marketplace','protected','internal')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(version_id, question_key),
  CHECK (question_key ~ '^[a-z][a-z0-9_]{1,79}$')
);

CREATE INDEX IF NOT EXISTS idx_customer_flow_questions_version_order
  ON customer_flow_questions(version_id, is_active, display_order, id);

CREATE TABLE IF NOT EXISTS customer_flow_question_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES customer_flow_questions(id) ON DELETE CASCADE,
  value VARCHAR(160) NOT NULL,
  label VARCHAR(240) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(question_id, value)
);

CREATE INDEX IF NOT EXISTS idx_customer_flow_options_question_order
  ON customer_flow_question_options(question_id, is_active, display_order, id);
