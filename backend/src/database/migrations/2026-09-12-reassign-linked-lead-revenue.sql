-- If a lead was purchased before it was linked to an investor, its revenue may
-- already have been pooled to another investment. Once investor_user_id is set,
-- explicit ownership must win: remove allocations for that purchase and allocate
-- the investor share to the linked investor's current investment.
WITH targets AS (
  SELECT DISTINCT ON (lp.id)
    lp.id AS lead_purchase_id,
    l.investor_user_id,
    l.industry_id,
    lp.amount::numeric AS gross_amount,
    inv.id AS investment_id
  FROM lead_purchases lp
  JOIN leads l ON l.id=lp.lead_id
  JOIN investments inv
    ON inv.user_id=l.investor_user_id
   AND inv.industry_id=l.industry_id
   AND inv.status IN ('active','matured')
   AND inv.starts_at<=CURRENT_TIMESTAMP
  WHERE lp.status='paid'
    AND l.investor_user_id IS NOT NULL
  ORDER BY lp.id, inv.created_at DESC, inv.id DESC
),
remove_wrong AS (
  DELETE FROM investment_revenue_allocations ira
  USING targets t
  WHERE ira.lead_purchase_id=t.lead_purchase_id
    AND ira.investment_id<>t.investment_id
  RETURNING ira.lead_purchase_id
),
rule_values AS (
  SELECT t.*,
    GREATEST(0,LEAST(100,COALESCE(r.investor_revenue_share_percent,100)))::numeric AS share_percent
  FROM targets t
  LEFT JOIN investment_industry_rules r
    ON r.industry_id=t.industry_id AND r.is_active=TRUE
)
INSERT INTO investment_revenue_allocations
  (investment_id,lead_purchase_id,industry_id,gross_sale_amount,investor_share_percent,allocated_amount)
SELECT
  investment_id,
  lead_purchase_id,
  industry_id,
  gross_amount,
  share_percent,
  ROUND((gross_amount*share_percent/100.0),2)
FROM rule_values
WHERE gross_amount>0
  AND share_percent>0
ON CONFLICT(investment_id,lead_purchase_id) DO UPDATE
SET gross_sale_amount=EXCLUDED.gross_sale_amount,
    investor_share_percent=EXCLUDED.investor_share_percent,
    allocated_amount=EXCLUDED.allocated_amount;
