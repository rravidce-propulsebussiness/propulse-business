-- Linked leads are owned by leads.investor_user_id.
-- Repair old pooled/wrong-investor allocations and make future paid/assignment
-- paths authoritative for the explicitly linked investor.

CREATE OR REPLACE FUNCTION repair_linked_lead_revenue_for_purchase(p_lead_purchase_id integer)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_investor_user_id integer;
  v_industry_id integer;
  v_gross numeric;
  v_share numeric;
  v_investment_id integer;
  v_investment_amount numeric;
BEGIN
  SELECT l.investor_user_id, l.industry_id, lp.amount
    INTO v_investor_user_id, v_industry_id, v_gross
  FROM lead_purchases lp
  JOIN leads l ON l.id = lp.lead_id
  WHERE lp.id = p_lead_purchase_id
    AND lp.status = 'paid';

  IF v_investor_user_id IS NULL OR v_industry_id IS NULL OR COALESCE(v_gross, 0) <= 0 THEN
    RETURN;
  END IF;

  SELECT GREATEST(0, LEAST(100, COALESCE(r.investor_revenue_share_percent, 100)))
    INTO v_share
  FROM investment_industry_rules r
  WHERE r.industry_id = v_industry_id
    AND r.is_active = TRUE
  ORDER BY r.id DESC
  LIMIT 1;
  v_share := COALESCE(v_share, 100);
  IF v_share <= 0 THEN RETURN; END IF;

  -- Remove any historical pooled allocation belonging to another investor.
  DELETE FROM investment_revenue_allocations ira
  USING investments i
  WHERE ira.lead_purchase_id = p_lead_purchase_id
    AND ira.investment_id = i.id
    AND i.user_id <> v_investor_user_id;

  -- If this purchase is already correctly allocated to this investor, keep it.
  IF EXISTS (
    SELECT 1
    FROM investment_revenue_allocations ira
    JOIN investments i ON i.id = ira.investment_id
    WHERE ira.lead_purchase_id = p_lead_purchase_id
      AND i.user_id = v_investor_user_id
  ) THEN
    RETURN;
  END IF;

  SELECT i.id, i.amount
    INTO v_investment_id, v_investment_amount
  FROM investments i
  WHERE i.user_id = v_investor_user_id
    AND i.industry_id = v_industry_id
    AND i.status IN ('active', 'matured')
    AND i.starts_at <= CURRENT_TIMESTAMP
  ORDER BY i.created_at DESC, i.id DESC
  LIMIT 1
  FOR UPDATE;

  IF v_investment_id IS NULL OR COALESCE(v_investment_amount, 0) <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO investment_revenue_allocations(
    investment_id, lead_purchase_id, industry_id,
    gross_sale_amount, investor_share_percent, allocated_amount
  )
  VALUES(
    v_investment_id, p_lead_purchase_id, v_industry_id,
    v_gross, v_share, ROUND(v_gross * v_share / 100.0, 2)
  )
  ON CONFLICT(investment_id, lead_purchase_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION allocate_linked_lead_investor_revenue()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    PERFORM repair_linked_lead_revenue_for_purchase(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_allocate_linked_lead_investor_revenue ON lead_purchases;
CREATE TRIGGER trg_allocate_linked_lead_investor_revenue
AFTER INSERT OR UPDATE OF status ON lead_purchases
FOR EACH ROW
EXECUTE FUNCTION allocate_linked_lead_investor_revenue();

CREATE OR REPLACE FUNCTION allocate_linked_lead_revenue_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_purchase record;
BEGIN
  IF NEW.investor_user_id IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.investor_user_id IS NOT DISTINCT FROM OLD.investor_user_id) THEN
    RETURN NEW;
  END IF;

  FOR v_purchase IN
    SELECT lp.id
    FROM lead_purchases lp
    WHERE lp.lead_id = NEW.id
      AND lp.status = 'paid'
  LOOP
    PERFORM repair_linked_lead_revenue_for_purchase(v_purchase.id);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_allocate_linked_lead_revenue_on_assignment ON leads;
CREATE TRIGGER trg_allocate_linked_lead_revenue_on_assignment
AFTER INSERT OR UPDATE OF investor_user_id ON leads
FOR EACH ROW
EXECUTE FUNCTION allocate_linked_lead_revenue_on_assignment();

-- One-time repair for all historical paid purchases on explicitly linked leads.
DO $$
DECLARE
  v_purchase record;
BEGIN
  FOR v_purchase IN
    SELECT lp.id
    FROM lead_purchases lp
    JOIN leads l ON l.id = lp.lead_id
    WHERE lp.status = 'paid'
      AND l.investor_user_id IS NOT NULL
  LOOP
    PERFORM repair_linked_lead_revenue_for_purchase(v_purchase.id);
  END LOOP;
END;
$$;
