ALTER TABLE investments
  ADD COLUMN IF NOT EXISTS amount_in_ads NUMERIC(12,2) NOT NULL DEFAULT 0;

UPDATE investments
SET amount_in_ads = CASE
  WHEN status IN ('active','matured','paid') THEN amount
  ELSE 0
END
WHERE amount_in_ads = 0;

ALTER TABLE investments
  ADD CONSTRAINT investments_amount_in_ads_nonnegative
  CHECK (amount_in_ads >= 0 AND amount_in_ads <= amount);
