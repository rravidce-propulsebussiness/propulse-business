CREATE TABLE IF NOT EXISTS lead_partner_payout_requests (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES lead_partners(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  payout_account_id INTEGER REFERENCES lead_partner_payout_accounts(id) ON DELETE SET NULL,
  payout_method VARCHAR(20) NOT NULL CHECK (payout_method IN ('bank','upi')),
  payout_account_snapshot JSONB NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','rejected','paid')),
  transfer_reference VARCHAR(255), proof_url TEXT, notes TEXT, rejection_reason TEXT,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, processed_at TIMESTAMP,
  processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL, paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lp_payout_requests_partner_status ON lead_partner_payout_requests(partner_id,status,requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_lp_payout_requests_user_status ON lead_partner_payout_requests(user_id,status,requested_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lp_payout_transfer_reference ON lead_partner_payout_requests(transfer_reference) WHERE transfer_reference IS NOT NULL;
CREATE TABLE IF NOT EXISTS lead_partner_payout_items (
  id SERIAL PRIMARY KEY, payout_id INTEGER NOT NULL REFERENCES lead_partner_payout_requests(id) ON DELETE CASCADE,
  earning_id INTEGER NOT NULL REFERENCES lead_partner_earnings(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','released','paid')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lp_payout_items_payout ON lead_partner_payout_items(payout_id,status);
CREATE INDEX IF NOT EXISTS idx_lp_payout_items_earning ON lead_partner_payout_items(earning_id,status);
CREATE INDEX IF NOT EXISTS idx_lp_earnings_payout_id ON lead_partner_earnings(payout_id);
