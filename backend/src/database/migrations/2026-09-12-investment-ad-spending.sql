BEGIN;

ALTER TABLE investments
  ADD COLUMN IF NOT EXISTS amount_in_ads NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount_in_ads >= 0),
  ADD COLUMN IF NOT EXISTS ad_spend_status VARCHAR(20) NOT NULL DEFAULT 'allocated' CHECK (ad_spend_status IN ('allocated','spending','spent'));

CREATE TABLE IF NOT EXISTS investment_ad_spends (
  id SERIAL PRIMARY KEY,
  investment_id INTEGER NOT NULL REFERENCES investments(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  platform VARCHAR(80),
  campaign VARCHAR(160),
  spend_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reference VARCHAR(160),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investment_ad_spends_investment ON investment_ad_spends(investment_id, spend_date DESC, id DESC);

-- Existing allocations remain valid. A newly allocated budget starts in the allocated state.
UPDATE investments
SET ad_spend_status = CASE
  WHEN COALESCE(amount_in_ads,0) <= 0 THEN 'allocated'
  ELSE 'spending'
END
WHERE ad_spend_status IS NULL OR ad_spend_status = 'allocated';

COMMIT;
