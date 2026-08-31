CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    payment_method VARCHAR(30) NOT NULL,
    gateway VARCHAR(50),
    gateway_order_id VARCHAR(150),
    gateway_payment_id VARCHAR(150),
    manual_reference VARCHAR(150),
    proof_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    notes TEXT,
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (payment_method IN ('gateway', 'manual')),
    CHECK (status IN ('pending', 'processing', 'paid', 'rejected', 'failed', 'refunded'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON payments(gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
