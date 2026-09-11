CREATE TABLE IF NOT EXISTS lead_crm (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','follow_up','interested','meeting','won','lost','not_interested')),
  remarks TEXT NOT NULL DEFAULT '',
  last_followed_up_at TIMESTAMP,
  next_followup_at TIMESTAMP,
  followup_count INTEGER NOT NULL DEFAULT 0 CHECK (followup_count >= 0),
  contacted_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (lead_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_lead_crm_user_status ON lead_crm(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lead_crm_next_followup ON lead_crm(user_id, next_followup_at);
CREATE INDEX IF NOT EXISTS idx_lead_crm_updated ON lead_crm(user_id, updated_at DESC);
