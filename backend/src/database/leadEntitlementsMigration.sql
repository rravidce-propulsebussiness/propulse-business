-- Lead membership entitlement claims.
-- One user can claim a given lead only once.
CREATE TABLE IF NOT EXISTS lead_entitlement_claims (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  membership_id INTEGER NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  entitlement_type VARCHAR(30) NOT NULL,
  claimed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, lead_id)
);
CREATE INDEX IF NOT EXISTS idx_lead_entitlement_claims_user ON lead_entitlement_claims(user_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_entitlement_claims_membership ON lead_entitlement_claims(membership_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_entitlement_claims_lead ON lead_entitlement_claims(lead_id);
