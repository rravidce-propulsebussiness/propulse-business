BEGIN;

CREATE TABLE IF NOT EXISTS investor_payout_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected','cancelled')),
  transfer_reference VARCHAR(120),
  proof_url TEXT,
  notes TEXT,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_investor_payout_requests_user_status ON investor_payout_requests(user_id,status);
CREATE INDEX IF NOT EXISTS idx_investor_payout_requests_status ON investor_payout_requests(status,requested_at);

COMMIT;
