-- Propulse membership checkout foundation for Razorpay.
-- Safe to run against the existing Propulse payment schema.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS membership_plan_id INTEGER REFERENCES membership_plans(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_membership_plan_id ON payments(membership_plan_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_gateway_order_id_unique
  ON payments(gateway_order_id) WHERE gateway_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS memberships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    membership_plan_id INTEGER NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
    payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('active', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_ends_at ON memberships(ends_at);

-- Keep at most one active membership row for a user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_one_active_per_user
  ON memberships(user_id) WHERE status = 'active';
