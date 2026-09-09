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

-- Clean duplicate leads that have never been purchased/claimed. Existing
-- access-bearing duplicates are deliberately preserved so financial/access
-- history is never destroyed by a schema migration.
DO $$
DECLARE
  duplicate_record RECORD;
  canonical_id INTEGER;
BEGIN
  FOR duplicate_record IN
    SELECT l.id, l.industry_id,
           regexp_replace(COALESCE(l.customer_phone,''),'[^0-9]','','g') AS phone
    FROM leads l
    WHERE l.id IN (
      SELECT MAX(id)
      FROM leads
      WHERE regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g') <> ''
        AND length(regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g')) >= 7
      GROUP BY industry_id, regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g')
      HAVING COUNT(*) > 1
    )
  LOOP
    SELECT MIN(id) INTO canonical_id
    FROM leads
    WHERE industry_id=duplicate_record.industry_id
      AND regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g')=duplicate_record.phone;

    IF canonical_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM lead_purchases WHERE lead_id=duplicate_record.id
      UNION ALL
      SELECT 1 FROM lead_entitlement_claims WHERE lead_id=duplicate_record.id
    ) THEN
      DELETE FROM leads WHERE id=duplicate_record.id;
    END IF;
  END LOOP;
END $$;
