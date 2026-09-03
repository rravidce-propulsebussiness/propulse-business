-- Align the database with the current configurable-share purchase model.
-- Historical migrations remain untouched; this migration changes the live schema safely.
ALTER TABLE lead_purchases DROP CONSTRAINT IF EXISTS lead_purchases_shares_check;
ALTER TABLE lead_purchases ADD CONSTRAINT lead_purchases_shares_positive CHECK (shares > 0);
