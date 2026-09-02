-- Booster orders: keep Booster services distinct from membership entitlements.
CREATE TABLE IF NOT EXISTS booster_orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  membership_plan_id BIGINT REFERENCES membership_plans(id),
  status VARCHAR(30) NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','pending_approval','approved','rejected','cancelled','completed')),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  package_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  add_ons JSONB NOT NULL DEFAULT '[]'::jsonb,
  payment_reference VARCHAR(200),
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booster_orders_user ON booster_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booster_orders_status ON booster_orders(status, created_at DESC);
