-- Lead sharing capacity: separate purchase package size from maximum buyers.
-- Forward migration; historical migrations remain unchanged.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS buyer_capacity INTEGER NOT NULL DEFAULT 1;

ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_buyer_capacity_check;

ALTER TABLE leads
  ADD CONSTRAINT leads_buyer_capacity_check CHECK (buyer_capacity > 0);

CREATE INDEX IF NOT EXISTS idx_leads_buyer_capacity ON leads(buyer_capacity);

-- Replace the historical 1/3/5 purchase constraint with a positive-integer rule.
ALTER TABLE lead_purchases
  DROP CONSTRAINT IF EXISTS lead_purchases_shares_check;

ALTER TABLE lead_purchases
  ADD CONSTRAINT lead_purchases_shares_check CHECK (shares > 0);
