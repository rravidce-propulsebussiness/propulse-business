-- Repair paid purchases of leads explicitly linked to an investor.
-- Once a lead is linked to an investor, investment location must not prevent
-- recording the investor's sale revenue. Maturity controls settlement only.
WITH candidates AS (
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
    AND NOT EXISTS (
      SELECT 1
      FROM investment_revenue_allocations ira
      WHERE ira.lead_purchase_id=lp.id
    )
  ORDER BY lp.id, inv.created_at DESC, inv.id DESC
), rule_values AS (
  SELECT c.*,
    GREATEST(0,LEAST(100,COALESCE(r.investor_revenue_share_percent,100)))::numeric AS share_percent
  FROM candidates c
  LEFT JOIN investment_industry_rules r
    ON r.industry_id=c.industry_id AND r.is_active=TRUE
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
ON CONFLICT(investment_id,lead_purchase_id) DO NOTHING;