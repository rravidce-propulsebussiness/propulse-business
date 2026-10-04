-- Guarantee investor revenue allocation for every paid lead explicitly linked to an investor.
-- This covers both direct paid purchases and pending-payment completion, regardless
-- of which application path completes the purchase.

CREATE OR REPLACE FUNCTION allocate_linked_lead_investor_revenue()
RETURNS trigger
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
  IF NEW.status <> 'paid' THEN
    RETURN NEW;
  END IF;

  SELECT l.investor_user_id, l.industry_id
    INTO v_investor_user_id, v_industry_id
  FROM leads l
  WHERE l.id = NEW.lead_id;

  IF v_investor_user_id IS NULL OR v_industry_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_gross := COALESCE(NEW.amount, 0);
  IF v_gross <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT GREATEST(0, LEAST(100, COALESCE(r.investor_revenue_share_percent, 100)))
    INTO v_share
  FROM investment_industry_rules r
  WHERE r.industry_id = v_industry_id
    AND r.is_active = TRUE
  ORDER BY r.id DESC
  LIMIT 1;

  v_share := COALESCE(v_share, 100);
  IF v_share <= 0 THEN
    RETURN NEW;
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
    RETURN NEW;
  END IF;

  INSERT INTO investment_revenue_allocations(
    investment_id,
    lead_purchase_id,
    industry_id,
    gross_sale_amount,
    investor_share_percent,
    allocated_amount
  )
  VALUES(
    v_investment_id,
    NEW.id,
    v_industry_id,
    v_gross,
    v_share,
    ROUND(v_gross * v_share / 100.0, 2)
  )
  ON CONFLICT(investment_id, lead_purchase_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_allocate_linked_lead_investor_revenue ON lead_purchases;
CREATE TRIGGER trg_allocate_linked_lead_investor_revenue
AFTER INSERT OR UPDATE OF status ON lead_purchases
FOR EACH ROW
EXECUTE FUNCTION allocate_linked_lead_investor_revenue();

-- If a paid purchase existed before the lead was linked to the investor,
-- allocate it as soon as investor_user_id is assigned.
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
    SELECT lp.id, lp.amount
    FROM lead_purchases lp
    WHERE lp.lead_id = NEW.id
      AND lp.status = 'paid'
  LOOP
    INSERT INTO investment_revenue_allocations(
      investment_id,
      lead_purchase_id,
      industry_id,
      gross_sale_amount,
      investor_share_percent,
      allocated_amount
    )
    SELECT
      i.id,
      v_purchase.id,
      NEW.industry_id,
      v_purchase.amount,
      GREATEST(0, LEAST(100, COALESCE(r.investor_revenue_share_percent, 100))),
      ROUND(v_purchase.amount * GREATEST(0, LEAST(100, COALESCE(r.investor_revenue_share_percent, 100))) / 100.0, 2)
    FROM investments i
    LEFT JOIN investment_industry_rules r
      ON r.industry_id = NEW.industry_id
     AND r.is_active = TRUE
    WHERE i.user_id = NEW.investor_user_id
      AND i.industry_id = NEW.industry_id
      AND i.status IN ('active', 'matured')
      AND i.starts_at <= CURRENT_TIMESTAMP
    ORDER BY i.created_at DESC, i.id DESC
    LIMIT 1
    ON CONFLICT(investment_id, lead_purchase_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_allocate_linked_lead_revenue_on_assignment ON leads;
CREATE TRIGGER trg_allocate_linked_lead_revenue_on_assignment
AFTER INSERT OR UPDATE OF investor_user_id ON leads
FOR EACH ROW
EXECUTE FUNCTION allocate_linked_lead_revenue_on_assignment();

-- Repair any paid linked purchases that are still missing an allocation.
INSERT INTO investment_revenue_allocations(
  investment_id,
  lead_purchase_id,
  industry_id,
  gross_sale_amount,
  investor_share_percent,
  allocated_amount
)
SELECT DISTINCT ON (lp.id)
  i.id,
  lp.id,
  l.industry_id,
  lp.amount,
  GREATEST(0, LEAST(100, COALESCE(r.investor_revenue_share_percent, 100))),
  ROUND(lp.amount * GREATEST(0, LEAST(100, COALESCE(r.investor_revenue_share_percent, 100))) / 100.0, 2)
FROM lead_purchases lp
JOIN leads l ON l.id = lp.lead_id
JOIN investments i
  ON i.user_id = l.investor_user_id
 AND i.industry_id = l.industry_id
 AND i.status IN ('active', 'matured')
 AND i.starts_at <= CURRENT_TIMESTAMP
LEFT JOIN investment_industry_rules r
  ON r.industry_id = l.industry_id
 AND r.is_active = TRUE
WHERE lp.status = 'paid'
  AND l.investor_user_id IS NOT NULL
  AND lp.amount > 0
  AND NOT EXISTS (
    SELECT 1
    FROM investment_revenue_allocations existing
    WHERE existing.lead_purchase_id = lp.id
  )
ORDER BY lp.id, i.created_at DESC, i.id DESC
ON CONFLICT(investment_id, lead_purchase_id) DO NOTHING;
