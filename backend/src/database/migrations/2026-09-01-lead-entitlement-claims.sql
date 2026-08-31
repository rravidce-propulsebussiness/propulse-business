BEGIN;

CREATE TABLE IF NOT EXISTS lead_entitlement_claims (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  membership_id INTEGER REFERENCES memberships(id) ON DELETE SET NULL,
  entitlement_type VARCHAR(30) NOT NULL,
  claimed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE (user_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_claims_user_claimed
  ON lead_entitlement_claims(user_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_claims_lead
  ON lead_entitlement_claims(lead_id);

COMMIT;
