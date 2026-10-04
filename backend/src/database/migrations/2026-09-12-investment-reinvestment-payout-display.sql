-- Reinvestment settles earnings into a child investment; it is not a cash transfer to the investor.
-- Keep payout_amount reserved for real investor cash transfers so admin balances/history do not show a false transfer.

CREATE OR REPLACE FUNCTION prevent_reinvestment_as_investor_payout()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payout_transfer_reference LIKE 'REINVESTMENT-%' THEN
    NEW.payout_amount := 0;
    NEW.payout_proof_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_investment_reinvestment_payout_display ON investments;

CREATE TRIGGER trg_investment_reinvestment_payout_display
BEFORE INSERT OR UPDATE OF payout_transfer_reference, payout_amount
ON investments
FOR EACH ROW
WHEN (NEW.payout_transfer_reference LIKE 'REINVESTMENT-%')
EXECUTE FUNCTION prevent_reinvestment_as_investor_payout();

UPDATE investments
SET payout_amount = 0,
    payout_proof_url = NULL
WHERE payout_transfer_reference LIKE 'REINVESTMENT-%'
  AND COALESCE(payout_amount, 0) <> 0;
