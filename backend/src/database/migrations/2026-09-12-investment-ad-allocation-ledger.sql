BEGIN;

CREATE TABLE IF NOT EXISTS investment_ad_allocations (
  id SERIAL PRIMARY KEY,
  investment_id INTEGER NOT NULL REFERENCES investments(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated','spending','spent')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investment_ad_allocations_investment ON investment_ad_allocations(investment_id, id DESC);

ALTER TABLE investment_ad_spends
  ADD COLUMN IF NOT EXISTS allocation_id INTEGER REFERENCES investment_ad_allocations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_investment_ad_spends_allocation ON investment_ad_spends(allocation_id, spend_date DESC, id DESC);

-- Convert the old single allocation field into the first allocation ledger entry.
INSERT INTO investment_ad_allocations(investment_id, amount, status, created_at, updated_at)
SELECT x.id, x.amount_in_ads,
       CASE
         WHEN COALESCE(x.amount_in_ads,0) <= 0 THEN 'allocated'
         WHEN COALESCE(s.total_spent,0) >= x.amount_in_ads THEN 'spent'
         WHEN COALESCE(s.total_spent,0) > 0 THEN 'spending'
         ELSE 'allocated'
       END,
       COALESCE(x.updated_at,x.created_at,CURRENT_TIMESTAMP),
       CURRENT_TIMESTAMP
FROM investments x
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(amount),0) AS total_spent
  FROM investment_ad_spends
  WHERE investment_id=x.id
) s ON TRUE
WHERE COALESCE(x.amount_in_ads,0) > 0
  AND NOT EXISTS (SELECT 1 FROM investment_ad_allocations a WHERE a.investment_id=x.id);

-- Existing spend rows belong to the first historical allocation when possible.
UPDATE investment_ad_spends s
SET allocation_id = a.id
FROM investment_ad_allocations a
WHERE s.allocation_id IS NULL
  AND a.investment_id=s.investment_id
  AND a.id=(SELECT MIN(a2.id) FROM investment_ad_allocations a2 WHERE a2.investment_id=s.investment_id);

COMMIT;
