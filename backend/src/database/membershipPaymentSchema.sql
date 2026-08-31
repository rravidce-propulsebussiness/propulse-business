-- Yearly membership/payment foundation. Membership plans can be activated later;
-- payment records support both gateway and manual payment methods.
CREATE TABLE IF NOT EXISTS membership_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    duration_months INTEGER NOT NULL DEFAULT 12,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    membership_plan_id INTEGER REFERENCES membership_plans(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    method VARCHAR(30) NOT NULL,
    gateway VARCHAR(50),
    gateway_order_id VARCHAR(160),
    gateway_payment_id VARCHAR(160),
    reference_number VARCHAR(160),
    proof_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    notes TEXT,
    paid_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (method IN ('gateway', 'manual')),
    CHECK (status IN ('pending', 'paid', 'failed', 'rejected', 'refunded'))
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments (method);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships (status);
CREATE INDEX IF NOT EXISTS idx_memberships_ends_at ON memberships (ends_at);
