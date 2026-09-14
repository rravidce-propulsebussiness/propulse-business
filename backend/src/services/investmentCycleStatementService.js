const pool = require('../config/database');

async function getCycleStatement(userId, cycleId) {
  const uid = Number(userId);
  const cid = Number(cycleId);
  if (!Number.isInteger(uid) || uid <= 0 || !Number.isInteger(cid) || cid <= 0) {
    throw Object.assign(new Error('Invalid investor or cycle'), { code: 'INVALID_CYCLE' });
  }

  const cycle = (await pool.query(`
    SELECT id,user_id,status,auto_invest,started_at,maturity_at,exit_requested_at,closed_at,
           admin_closed_by,admin_closed_reason,exit_reason
    FROM investment_cycles
    WHERE id=$1 AND user_id=$2
  `, [cid, uid])).rows[0];
  if (!cycle) throw Object.assign(new Error('Investment cycle not found'), { code: 'CYCLE_NOT_FOUND' });

  const investmentRows = (await pool.query(`
    SELECT i.id,i.amount,i.status,i.created_at,i.updated_at,i.reinvestment_enabled,i.parent_investment_id,
           COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s WHERE s.investment_id=i.id),0)::numeric AS ad_spent,
           COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a WHERE a.investment_id=i.id),0)::numeric AS investor_earnings
    FROM investments i
    WHERE i.user_id=$1 AND i.cycle_id=$2 AND i.status<>'cancelled'
    ORDER BY i.created_at ASC,i.id ASC
  `, [uid, cid])).rows.map(row => ({
    id: Number(row.id), amount: Number(row.amount || 0), status: row.status,
    created_at: row.created_at, updated_at: row.updated_at,
    reinvestment_enabled: Boolean(row.reinvestment_enabled),
    parent_investment_id: row.parent_investment_id == null ? null : Number(row.parent_investment_id),
    ad_spent: Number(row.ad_spent || 0), investor_earnings: Number(row.investor_earnings || 0),
  }));

  const investment = {
    count: investmentRows.length,
    principal: investmentRows.reduce((sum,row)=>sum+row.amount,0),
  };

  const ads = (await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM investment_ad_spends s JOIN investments i ON i.id=s.investment_id WHERE i.user_id=$1 AND i.cycle_id=$2 AND i.status<>'cancelled')::int AS transactions,
      COALESCE((SELECT SUM(a.amount) FROM investment_ad_allocations a JOIN investments i ON i.id=a.investment_id WHERE i.user_id=$1 AND i.cycle_id=$2 AND i.status<>'cancelled'),0)::numeric AS allocated,
      COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s JOIN investments i ON i.id=s.investment_id WHERE i.user_id=$1 AND i.cycle_id=$2 AND i.status<>'cancelled'),0)::numeric AS spent
  `,[uid,cid])).rows[0];
  ads.remaining=Math.max(0,Number(ads.allocated||0)-Number(ads.spent||0));

  const adSpendRows = (await pool.query(`
    SELECT s.id,s.investment_id,s.amount,s.spend_date
    FROM investment_ad_spends s
    JOIN investments i ON i.id=s.investment_id
    WHERE i.user_id=$1 AND i.cycle_id=$2 AND i.status<>'cancelled'
    ORDER BY s.spend_date ASC,s.id ASC
  `,[uid,cid])).rows.map(row=>({
    id:Number(row.id),investment_id:Number(row.investment_id),amount:Number(row.amount||0),spend_date:row.spend_date,
  }));

  const leads = (await pool.query(`
    SELECT
      COUNT(DISTINCT l.id)::int AS linked,
      COUNT(DISTINCT l.id) FILTER (WHERE EXISTS (SELECT 1 FROM lead_purchases lp WHERE lp.lead_id=l.id AND lp.status='paid'))::int AS sold,
      COUNT(DISTINCT lp.id) FILTER (WHERE lp.status='paid' AND COALESCE(lp.shares,1)=1)::int AS single_share_sales,
      COUNT(DISTINCT lp.id) FILTER (WHERE lp.status='paid' AND COALESCE(lp.shares,1)>1)::int AS shared_sales,
      COALESCE(SUM(lp.shares) FILTER (WHERE lp.status='paid'),0)::int AS shares_sold,
      COUNT(DISTINCT l.id) FILTER (WHERE LOWER(COALESCE(l.status,''))='expired')::int AS expired,
      COUNT(DISTINCT l.id) FILTER (WHERE LOWER(COALESCE(l.status,''))='closed')::int AS closed,
      COUNT(DISTINCT l.id) FILTER (WHERE LOWER(COALESCE(l.status,''))='admin_closed')::int AS admin_closed,
      COUNT(DISTINCT l.id) FILTER (WHERE NOT EXISTS (SELECT 1 FROM lead_purchases lp2 WHERE lp2.lead_id=l.id AND lp2.status='paid') AND LOWER(COALESCE(l.status,'')) NOT IN ('expired','closed','admin_closed','sold','consumed'))::int AS pending
    FROM leads l
    LEFT JOIN lead_purchases lp ON lp.lead_id=l.id
    WHERE l.investor_user_id=$1 AND l.cycle_id=$2
  `,[uid,cid])).rows[0];

  const revenue = (await pool.query(`
    SELECT COUNT(lp.id) FILTER (WHERE lp.status='paid')::int AS sales,
           COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0)::numeric AS gross_sales,
           COALESCE((SELECT SUM(ira.allocated_amount) FROM investment_revenue_allocations ira JOIN investments i ON i.id=ira.investment_id WHERE i.user_id=$1 AND i.cycle_id=$2 AND i.status<>'cancelled'),0)::numeric AS investor_earnings
    FROM lead_purchases lp
    JOIN leads l ON l.id=lp.lead_id
    WHERE l.investor_user_id=$1 AND l.cycle_id=$2
  `,[uid,cid])).rows[0];

  const payouts = (await pool.query(`
    SELECT COUNT(*)::int AS requests,
           COALESCE(SUM(amount) FILTER (WHERE status='paid'),0)::numeric AS paid,
           COALESCE(SUM(amount) FILTER (WHERE status='pending'),0)::numeric AS pending,
           COALESCE(SUM(amount) FILTER (WHERE status='rejected'),0)::numeric AS rejected
    FROM investor_payout_requests
    WHERE user_id=$1 AND cycle_id=$2
  `,[uid,cid])).rows[0];

  const leadRows = (await pool.query(`
    SELECT l.id,l.status,l.created_at,
           COUNT(lp.id) FILTER (WHERE lp.status='paid')::int AS paid_sales,
           COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0)::numeric AS gross_revenue,
           COALESCE(SUM(lp.shares) FILTER (WHERE lp.status='paid'),0)::int AS shares_sold,
           COALESCE((SELECT SUM(ira.allocated_amount) FROM investment_revenue_allocations ira WHERE ira.lead_purchase_id IN (SELECT lp2.id FROM lead_purchases lp2 WHERE lp2.lead_id=l.id AND lp2.status='paid') AND ira.investment_id IN (SELECT i2.id FROM investments i2 WHERE i2.user_id=$1 AND i2.cycle_id=$2 AND i2.status<>'cancelled')),0)::numeric AS investor_earnings
    FROM leads l
    LEFT JOIN lead_purchases lp ON lp.lead_id=l.id
    WHERE l.investor_user_id=$1 AND l.cycle_id=$2
    GROUP BY l.id,l.status,l.created_at
    ORDER BY l.created_at ASC,l.id ASC
  `,[uid,cid])).rows.map(row=>({id:Number(row.id),status:row.status,created_at:row.created_at,paid_sales:Number(row.paid_sales||0),shares_sold:Number(row.shares_sold||0),gross_revenue:Number(row.gross_revenue||0),investor_earnings:Number(row.investor_earnings||0)}));

  const saleRows = (await pool.query(`
    SELECT lp.id AS purchase_id,lp.lead_id,COALESCE(lp.shares,1)::int AS shares,lp.amount::numeric AS amount,lp.created_at AS sold_at,
           COALESCE((SELECT SUM(ira.allocated_amount) FROM investment_revenue_allocations ira JOIN investments i ON i.id=ira.investment_id WHERE ira.lead_purchase_id=lp.id AND i.user_id=$1 AND i.cycle_id=$2 AND i.status<>'cancelled'),0)::numeric AS investor_earnings
    FROM lead_purchases lp
    JOIN leads l ON l.id=lp.lead_id
    WHERE lp.status='paid' AND l.investor_user_id=$1 AND l.cycle_id=$2
    ORDER BY lp.created_at ASC,lp.id ASC
  `,[uid,cid])).rows.map(row=>({purchase_id:Number(row.purchase_id),lead_id:Number(row.lead_id),shares:Number(row.shares||1),amount:Number(row.amount||0),sold_at:row.sold_at,investor_earnings:Number(row.investor_earnings||0)}));

  // Keep payout history cycle-scoped without depending on optional admin-transfer columns.
  const withdrawalRows = (await pool.query(`
    SELECT id,amount,status,created_at
    FROM investor_payout_requests
    WHERE user_id=$1 AND cycle_id=$2
    ORDER BY created_at ASC,id ASC
  `,[uid,cid])).rows.map(row=>({id:Number(row.id),amount:Number(row.amount||0),status:row.status,created_at:row.created_at}));

  const events=[];
  for(const row of investmentRows) events.push({type:row.parent_investment_id==null?'investment':'reinvestment',reference_id:row.id,description:row.parent_investment_id==null?`Investment #${row.id} added`:`Reinvestment #${row.id} added`,amount:row.amount,occurred_at:row.created_at});
  for(const row of adSpendRows) events.push({type:'ad_spend',reference_id:row.id,description:`Ads spent · Investment #${row.investment_id}`,amount:-Math.abs(row.amount),occurred_at:row.spend_date});
  for(const row of saleRows) events.push({type:'lead_sale',reference_id:row.purchase_id,description:`Lead #${row.lead_id} sold · ${row.shares===1?'1 single share':`${row.shares} shared shares`}`,amount:row.investor_earnings,occurred_at:row.sold_at});
  for(const row of withdrawalRows){if(String(row.status||'').toLowerCase()==='paid')events.push({type:'withdrawal_paid',reference_id:row.id,description:'Withdrawal paid · Manual transfer',amount:-Math.abs(row.amount),occurred_at:row.created_at});}
  events.sort((a,b)=>new Date(a.occurred_at||0)-new Date(b.occurred_at||0)||Number(a.reference_id)-Number(b.reference_id));
  let running=0;for(const event of events){running+=Number(event.amount||0);event.balance_after=Number(running.toFixed(2));}

  return {
    cycle:{...cycle,id:Number(cycle.id),user_id:Number(cycle.user_id),auto_invest:Boolean(cycle.auto_invest)},
    investment:{count:Number(investment.count||0),principal:Number(investment.principal||0)},
    investments:investmentRows,
    ads:{transactions:Number(ads.transactions||0),allocated:Number(ads.allocated||0),spent:Number(ads.spent||0),remaining:Number(ads.remaining||0),detail:adSpendRows},
    leads:{linked:Number(leads.linked||0),sold:Number(leads.sold||0),single_share_sales:Number(leads.single_share_sales||0),shared_sales:Number(leads.shared_sales||0),shares_sold:Number(leads.shares_sold||0),expired:Number(leads.expired||0),closed:Number(leads.closed||0),admin_closed:Number(leads.admin_closed||0),pending:Number(leads.pending||0)},
    revenue:{sales:Number(revenue.sales||0),generated:Number(revenue.gross_sales||0),gross_sales:Number(revenue.gross_sales||0),investor_earnings:Number(revenue.investor_earnings||0)},
    payouts:{requests:Number(payouts.requests||0),paid:Number(payouts.paid||0),pending:Number(payouts.pending||0),rejected:Number(payouts.rejected||0)},
    withdrawal_detail:withdrawalRows,leads_detail:leadRows,sales_detail:saleRows,events,
  };
}

module.exports={getCycleStatement};
