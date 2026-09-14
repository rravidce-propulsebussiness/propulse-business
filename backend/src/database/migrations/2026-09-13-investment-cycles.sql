BEGIN;

CREATE TABLE IF NOT EXISTS investment_cycles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS','CLOSED')),
  auto_invest BOOLEAN NOT NULL DEFAULT TRUE,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  maturity_at TIMESTAMP,
  exit_requested_at TIMESTAMP,
  closed_at TIMESTAMP,
  exit_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investment_cycles_user_status ON investment_cycles(user_id,status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_investment_cycles_one_open_per_user ON investment_cycles(user_id) WHERE status IN ('ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS');

ALTER TABLE investments ADD COLUMN IF NOT EXISTS cycle_id INTEGER REFERENCES investment_cycles(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_investments_cycle ON investments(cycle_id);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS cycle_id INTEGER REFERENCES investment_cycles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_cycle ON leads(cycle_id);

ALTER TABLE investor_payout_requests ADD COLUMN IF NOT EXISTS cycle_id INTEGER REFERENCES investment_cycles(id) ON DELETE RESTRICT;
ALTER TABLE investor_payout_requests ADD COLUMN IF NOT EXISTS withdrawal_type VARCHAR(20) NOT NULL DEFAULT 'PARTIAL' CHECK (withdrawal_type IN ('PARTIAL','FINAL_EXIT'));
CREATE INDEX IF NOT EXISTS idx_investor_payout_requests_cycle_status ON investor_payout_requests(cycle_id,status);

WITH investor_rows AS (
  SELECT i.user_id,
         BOOL_OR(i.status IN ('pending','active','matured')) AS has_open_investment,
         (ARRAY_AGG(COALESCE(i.reinvestment_enabled,FALSE) ORDER BY i.created_at DESC,i.id DESC))[1] AS auto_invest,
         MAX(i.matures_at) AS maturity_at
  FROM investments i
  WHERE i.status <> 'cancelled'
  GROUP BY i.user_id
)
INSERT INTO investment_cycles(user_id,status,auto_invest,started_at,maturity_at,closed_at)
SELECT user_id,CASE WHEN has_open_investment THEN 'ACTIVE' ELSE 'CLOSED' END,
       COALESCE(auto_invest,TRUE),CURRENT_TIMESTAMP,maturity_at,
       CASE WHEN has_open_investment THEN NULL ELSE CURRENT_TIMESTAMP END
FROM investor_rows ir
WHERE NOT EXISTS (SELECT 1 FROM investment_cycles c WHERE c.user_id=ir.user_id);

INSERT INTO investment_cycles(user_id,status,auto_invest,started_at,closed_at)
SELECT DISTINCT l.investor_user_id,'CLOSED',TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM leads l
WHERE l.investor_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM investment_cycles c WHERE c.user_id=l.investor_user_id);

UPDATE investments i SET cycle_id=c.id,updated_at=CURRENT_TIMESTAMP
FROM investment_cycles c WHERE c.user_id=i.user_id AND i.cycle_id IS NULL;

UPDATE leads l SET cycle_id=c.id
FROM investment_cycles c
WHERE c.user_id=l.investor_user_id AND l.investor_user_id IS NOT NULL AND l.cycle_id IS NULL;

CREATE OR REPLACE FUNCTION assign_lead_to_investor_cycle()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_cycle_id INTEGER;
BEGIN
  IF NEW.investor_user_id IS NULL THEN NEW.cycle_id := NULL; RETURN NEW; END IF;
  SELECT c.id INTO target_cycle_id FROM investment_cycles c
  WHERE c.user_id=NEW.investor_user_id AND c.status='ACTIVE'
  ORDER BY c.id DESC LIMIT 1;
  IF target_cycle_id IS NULL THEN
    RAISE EXCEPTION 'Investor has no active investment cycle available for lead assignment' USING ERRCODE='23514';
  END IF;
  NEW.cycle_id := target_cycle_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_lead_to_investor_cycle ON leads;
CREATE TRIGGER trg_assign_lead_to_investor_cycle
BEFORE INSERT OR UPDATE OF investor_user_id ON leads
FOR EACH ROW EXECUTE FUNCTION assign_lead_to_investor_cycle();

CREATE OR REPLACE FUNCTION maybe_close_investment_cycle()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cycle_row investment_cycles%ROWTYPE; pending_count INTEGER;
BEGIN
  IF NEW.cycle_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO cycle_row FROM investment_cycles WHERE id=NEW.cycle_id FOR UPDATE;
  IF cycle_row.id IS NULL OR cycle_row.status='CLOSED' THEN RETURN NEW; END IF;
  SELECT COUNT(*)::int INTO pending_count FROM leads
  WHERE cycle_id=cycle_row.id
    AND LOWER(COALESCE(status,'')) NOT IN ('sold','consumed','expired','closed','admin_closed');
  IF pending_count=0 AND ((cycle_row.auto_invest AND cycle_row.status='EXIT_REQUESTED') OR
     ((NOT cycle_row.auto_invest) AND cycle_row.maturity_at IS NOT NULL AND cycle_row.maturity_at<=CURRENT_TIMESTAMP)) THEN
    UPDATE investment_cycles SET status='CLOSED',closed_at=COALESCE(closed_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=cycle_row.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maybe_close_investment_cycle ON leads;
CREATE TRIGGER trg_maybe_close_investment_cycle
AFTER UPDATE OF status ON leads
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION maybe_close_investment_cycle();

COMMIT;
