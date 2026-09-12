-- Investor-linked leads belong to their linked investor for revenue allocation.
-- Investment maturity controls when earnings may be paid, not whether a linked lead sale can earn revenue.
-- This migration also backfills already-paid linked leads that were missed while an immediate-maturity
-- investment was excluded by the old matures_at > CURRENT_TIMESTAMP rule.

CREATE OR REPLACE FUNCTION ensure_linked_lead_investment_revenue(p_lead_purchase_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_investor_user_id integer;
  v_industry_id integer;
  v_state_id integer;
  v_city_id integer;
  v_gross numeric;
  v_share numeric;
  v_total numeric;
BEGIN
  SELECT l.investor_user_id, l.industry_id, l.state_id, l.city_id,
         COALESCE(lp.amount,0)
    INTO v_investor_user_id, v_industry_id, v_state_id, v_city_id, v_gross
  FROM lead_purchases lp
  JOIN leads l ON l.id=lp.lead_id
  WHERE lp.id=p_lead_purchase_id AND lp.status='paid';

  IF v_investor_user_id IS NULL OR COALESCE(v_gross,0)<=0 THEN RETURN; END IF;

  SELECT GREATEST(0,LEAST(100,COALESCE(investor_revenue_share_percent,100)))
    INTO v_share
  FROM investment_industry_rules
  WHERE industry_id=v_industry_id AND is_active=TRUE
  FOR UPDATE;

  v_share:=COALESCE(v_share,100);
  IF v_share<=0 THEN RETURN; END IF;

  SELECT COALESCE(SUM(amount),0)
    INTO v_total
  FROM investments
  WHERE user_id=v_investor_user_id
    AND industry_id=v_industry_id
    AND status IN ('active','matured')
    AND starts_at<=CURRENT_TIMESTAMP
    AND (state_id IS NULL OR (state_id=v_state_id AND (city_id IS NULL OR city_id=v_city_id)));

  IF v_total<=0 THEN RETURN; END IF;

  INSERT INTO investment_revenue_allocations
    (investment_id,lead_purchase_id,industry_id,gross_sale_amount,investor_share_percent,allocated_amount)
  SELECT inv.id,
         p_lead_purchase_id,
         v_industry_id,
         v_gross,
         v_share,
         ROUND((v_gross*v_share/100)*(inv.amount/v_total),2)
  FROM investments inv
  WHERE inv.user_id=v_investor_user_id
    AND inv.industry_id=v_industry_id
    AND inv.status IN ('active','matured')
    AND inv.starts_at<=CURRENT_TIMESTAMP
    AND (inv.state_id IS NULL OR (inv.state_id=v_state_id AND (inv.city_id IS NULL OR inv.city_id=v_city_id)))
    AND inv.amount>0
  ON CONFLICT(investment_id,lead_purchase_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION allocate_linked_lead_purchase_revenue()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status='paid' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM ensure_linked_lead_investment_revenue(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_allocate_linked_lead_purchase_revenue ON lead_purchases;
CREATE TRIGGER trg_allocate_linked_lead_purchase_revenue
AFTER INSERT OR UPDATE OF status ON lead_purchases
FOR EACH ROW
EXECUTE FUNCTION allocate_linked_lead_purchase_revenue();

-- If the application attempts to allocate a linked lead to unrelated investors,
-- redirect the allocation to the linked investor's eligible investment(s) instead.
CREATE OR REPLACE FUNCTION enforce_linked_lead_revenue_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_linked_user_id integer;
  v_investment_user_id integer;
BEGIN
  IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;

  SELECT l.investor_user_id INTO v_linked_user_id
  FROM lead_purchases lp
  JOIN leads l ON l.id=lp.lead_id
  WHERE lp.id=NEW.lead_purchase_id;

  IF v_linked_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT user_id INTO v_investment_user_id
  FROM investments WHERE id=NEW.investment_id;

  IF v_investment_user_id IS DISTINCT FROM v_linked_user_id THEN
    PERFORM ensure_linked_lead_investment_revenue(NEW.lead_purchase_id);
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_linked_lead_revenue_owner ON investment_revenue_allocations;
CREATE TRIGGER trg_enforce_linked_lead_revenue_owner
BEFORE INSERT ON investment_revenue_allocations
FOR EACH ROW
EXECUTE FUNCTION enforce_linked_lead_revenue_owner();

-- Backfill paid purchases for investor-linked leads that do not yet have an allocation.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT lp.id
    FROM lead_purchases lp
    JOIN leads l ON l.id=lp.lead_id
    WHERE lp.status='paid'
      AND l.investor_user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM investment_revenue_allocations ira
        WHERE ira.lead_purchase_id=lp.id
      )
    ORDER BY lp.id
  LOOP
    PERFORM ensure_linked_lead_investment_revenue(r.id);
  END LOOP;
END;
$$;
