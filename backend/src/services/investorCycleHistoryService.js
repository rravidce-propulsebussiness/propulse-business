const pool = require('../config/database');

async function list(userId) {
  const uid = Number(userId);
  const rows = (await pool.query(`
    SELECT ic.id,ic.user_id,ic.status,ic.auto_invest,ic.started_at,ic.maturity_at,
           ic.exit_requested_at,ic.closed_at,ic.admin_closed_reason,ic.exit_reason,
           (SELECT COUNT(*)::int FROM investments i WHERE i.cycle_id=ic.id AND i.status<>'cancelled') AS investment_count,
           (SELECT COALESCE(SUM(i.amount),0)::numeric FROM investments i WHERE i.cycle_id=ic.id AND i.status<>'cancelled') AS total_invested,
           (SELECT COALESCE(SUM(i.amount),0)::numeric FROM investments i WHERE i.cycle_id=ic.id AND i.status<>'cancelled' AND i.parent_investment_id IS NULL) AS actual_investment,
           (SELECT COALESCE(SUM(i.amount),0)::numeric FROM investments i WHERE i.cycle_id=ic.id AND i.status<>'cancelled' AND i.parent_investment_id IS NOT NULL) AS reinvestment,
           (SELECT COUNT(*)::int FROM leads l WHERE l.investor_user_id=$1 AND l.cycle_id=ic.id) AS linked_leads,
           (SELECT COUNT(*)::int FROM leads l WHERE l.investor_user_id=$1 AND l.cycle_id=ic.id AND EXISTS (SELECT 1 FROM lead_purchases lp WHERE lp.lead_id=l.id AND lp.status='paid')) AS sold_leads,
           (SELECT COALESCE(SUM(lp.amount),0)::numeric FROM lead_purchases lp JOIN leads l ON l.id=lp.lead_id WHERE l.investor_user_id=$1 AND l.cycle_id=ic.id AND lp.status='paid') AS gross_revenue,
           (SELECT COALESCE(SUM(ira.allocated_amount),0)::numeric FROM investment_revenue_allocations ira JOIN investments i ON i.id=ira.investment_id WHERE i.user_id=$1 AND i.cycle_id=ic.id AND i.status<>'cancelled') AS investor_earnings,
           (SELECT COALESCE(SUM(s.amount),0)::numeric FROM investment_ad_spends s JOIN investments i ON i.id=s.investment_id WHERE i.user_id=$1 AND i.cycle_id=ic.id AND i.status<>'cancelled') AS ad_spent
    FROM investment_cycles ic
    WHERE ic.user_id=$1
    ORDER BY CASE WHEN ic.status IN ('ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS') THEN 0 ELSE 1 END,
             ic.id DESC
  `,[uid])).rows;
  return rows.map(r => ({...r,id:Number(r.id),user_id:Number(r.user_id),auto_invest:Boolean(r.auto_invest),investment_count:Number(r.investment_count||0),total_invested:Number(r.total_invested||0),actual_investment:Number(r.actual_investment||0),reinvestment:Number(r.reinvestment||0),linked_leads:Number(r.linked_leads||0),sold_leads:Number(r.sold_leads||0),gross_revenue:Number(r.gross_revenue||0),investor_earnings:Number(r.investor_earnings||0),ad_spent:Number(r.ad_spent||0)}));
}
module.exports = { list };
