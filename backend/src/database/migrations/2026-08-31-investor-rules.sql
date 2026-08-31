-- Investor is a separate feature unlocked for active Pro customers.
ALTER TABLE investor_settings
  ADD COLUMN IF NOT EXISTS requires_pro BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE investor_settings
  ADD COLUMN IF NOT EXISTS customer_industry_limit INTEGER NOT NULL DEFAULT 10 CHECK (customer_industry_limit >= 0);

UPDATE investor_settings
SET requires_pro = TRUE,
    customer_industry_limit = COALESCE(customer_industry_limit, default_industry_limit, 10)
WHERE id = 1;
