CREATE OR REPLACE FUNCTION reserve_lead_wallet_for_pending_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  wallet_balance numeric := 0;
  reserved_amount numeric := 0;
  available_balance numeric := 0;
  wallet_amount numeric := 0;
BEGIN
  IF NEW.purchase_type='lead'
     AND NEW.wallet_transaction_id IS NULL
     AND NEW.status IN ('pending','paid')
     AND (COALESCE(NEW.wallet_amount,0)>0 OR NEW.status='paid') THEN
    INSERT INTO wallets(user_id) VALUES(NEW.user_id) ON CONFLICT(user_id) DO NOTHING;
    SELECT balance INTO wallet_balance FROM wallets WHERE user_id=NEW.user_id FOR UPDATE;

    SELECT COALESCE(SUM(wallet_amount),0)
      INTO reserved_amount
      FROM payments
     WHERE user_id=NEW.user_id
       AND purchase_type='lead'
       AND status='pending'
       AND id<>NEW.id
       AND COALESCE(wallet_amount,0)>0;

    available_balance:=GREATEST(0,COALESCE(wallet_balance,0)-reserved_amount);
    wallet_amount:=LEAST(available_balance,GREATEST(0,COALESCE(NEW.amount,0)));

    NEW.wallet_amount:=ROUND(wallet_amount,2);
    NEW.external_amount:=ROUND(GREATEST(0,COALESCE(NEW.amount,0)-wallet_amount),2);
    NEW.wallet_transaction_id:=NULL;
    NEW.payment_method:='manual';
    NEW.status:='pending';
    NEW.paid_at:=NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reserve_lead_wallet_on_payment ON payments;
CREATE TRIGGER trg_reserve_lead_wallet_on_payment
BEFORE UPDATE OF status,wallet_amount,external_amount,wallet_transaction_id ON payments
FOR EACH ROW
EXECUTE FUNCTION reserve_lead_wallet_for_pending_payment();
