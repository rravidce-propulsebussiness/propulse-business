CREATE TABLE IF NOT EXISTS membership_admin_history (
    id SERIAL PRIMARY KEY,
    membership_id INTEGER NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(40) NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    old_expires_at TIMESTAMP,
    new_expires_at TIMESTAMP,
    payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_membership_admin_history_membership ON membership_admin_history(membership_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_membership_admin_history_user ON membership_admin_history(user_id, created_at DESC);
