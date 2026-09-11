ALTER TABLE investments
  ADD COLUMN IF NOT EXISTS amount_in_ads NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE investments
  ADD CONSTRAINT investments_amount_in_ads_nonnegative
  CHECK (amount_in_ads >= 0 AND amount_in_ads <= amount);
