-- Admin investor payout with auto-reinvest records the new child investment on the paid parent
-- (investorAdminOperationsService). The column was never created, so every reinvested payout
-- failed with "column reinvestment_child_investment_id of relation investments does not exist".
ALTER TABLE investments
  ADD COLUMN IF NOT EXISTS reinvestment_child_investment_id INTEGER REFERENCES investments(id) ON DELETE SET NULL;
