BEGIN;

CREATE TABLE IF NOT EXISTS investor_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id=1),
  requires_pro BOOLEAN NOT NULL DEFAULT TRUE,
  customer_industry_limit INTEGER NOT NULL DEFAULT 10 CHECK (customer_industry_limit >= 0),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE investor_settings ADD COLUMN IF NOT EXISTS global_limit NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (global_limit >= 0);
ALTER TABLE investor_settings ADD COLUMN IF NOT EXISTS default_industry_limit NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (default_industry_limit >= 0);
ALTER TABLE investor_settings ADD COLUMN IF NOT EXISTS min_investment NUMERIC(14,2) NOT NULL DEFAULT 1 CHECK (min_investment > 0);
ALTER TABLE investor_settings ADD COLUMN IF NOT EXISTS max_investment NUMERIC(14,2);
ALTER TABLE investor_settings ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;
INSERT INTO investor_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
UPDATE investor_settings SET is_enabled=enabled WHERE id=1;

CREATE TABLE IF NOT EXISTS investor_industry_limits (
  id SERIAL PRIMARY KEY,
  industry_id INTEGER NOT NULL UNIQUE REFERENCES industries(id) ON DELETE CASCADE,
  investor_limit NUMERIC(16,2) NOT NULL CHECK (investor_limit >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investment_industry_rules (
  id SERIAL PRIMARY KEY,
  industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE RESTRICT,
  minimum_amount NUMERIC(14,2) NOT NULL CHECK (minimum_amount > 0),
  maximum_amount NUMERIC(14,2) NOT NULL CHECK (maximum_amount >= minimum_amount),
  total_capacity NUMERIC(16,2),
  return_percent NUMERIC(7,3) NOT NULL DEFAULT 0 CHECK (return_percent >= 0),
  maturity_days INTEGER NOT NULL DEFAULT 30 CHECK (maturity_days > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(industry_id)
);
CREATE INDEX IF NOT EXISTS idx_investment_rules_active ON investment_industry_rules(is_active);

CREATE TABLE IF NOT EXISTS investments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  industry_id INTEGER NOT NULL REFERENCES industries(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  return_percent NUMERIC(7,3) NOT NULL CHECK (return_percent >= 0),
  expected_return NUMERIC(14,2) NOT NULL CHECK (expected_return >= 0),
  maturity_days INTEGER NOT NULL CHECK (maturity_days > 0),
  starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  matures_at TIMESTAMP NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','matured','paid','cancelled')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_investments_user_status ON investments(user_id,status);
CREATE INDEX IF NOT EXISTS idx_investments_industry_status ON investments(industry_id,status);

CREATE TABLE IF NOT EXISTS investment_transactions (
  id SERIAL PRIMARY KEY,
  investment_id INTEGER NOT NULL REFERENCES investments(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type VARCHAR(30) NOT NULL CHECK (type IN ('investment','return')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reference_type VARCHAR(60),
  reference_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_investment ON investment_transactions(investment_id);

COMMIT;
