const pool = require('../config/database');

function normalizeRow(row){
  const totalSpent=Number(row.ad_spent||0);
  const currentAllocation=Number(row.current_ad_allocation||0);
  const currentSpent=Number(row.current_ad_spent||0);
  const currentRemaining=Math.max(0,currentAllocation-currentSpent);
  const generated=Number(row.allocated_revenue||0);
  const matured=new Date(row.matures_at)<=new Date();
  const payableNow=row.status!=='paid'&&row.status!=='cancelled'&&matured?generated:0;
  return{
    ...row,
    amount:Number(row.amount||0),
    amount_in_ads:currentAllocation,
    is_reinvestment:row.parent_investment_id!==null,
    ad_spent:totalSpent,
    current_ad_spent:currentSpent,
    ad_remaining:currentRemaining,
    current_ad_allocation:currentAllocation,
    total_ad_allocated:Number(row.total_ad_allocated||0),
    funds_available_for_ads:Number(Math.max(0,Number(row.amount||0)-totalSpent-currentRemaining).toFixed(2)),
    allocated_revenue:Number(generated.toFixed(2)),
    payable_now:Number(payableNow.toFixed(2)),
    linked_gross_sales:Number(row.linked_gross_sales||0),
    paid_to_investor:Number(row.paid_to_investor||0),
    linked_leads:Number(row.linked_leads||0),
    sold_linked_leads:Number(row.sold_linked_leads||0),
    linked_paid_sales:Number(row.linked_paid_sales||0),
    allocated_sales:Number(row.allocated_sales||0),
    reinvestment_enabled:Boolean(row.reinvestment_enabled),
    linked_lead_ids:Array.isArray(row.linked_lead_ids)?row.linked_lead_ids.map(Number):[],
  };
}

function buildInvestors(rows){
  const investorsMap=new Map();
  for(const row of rows){
    if(!investorsMap.has(row.user_id)){
      investorsMap.set(row.user_id,{
        user_id:row.user_id,user_name:row.user_name,user_email:row.user_email,
        current_cycle_id:row.cycle_id?Number(row.cycle_id):null,current_cycle_status:row.status,
        investment_count:0,total_invested:0,active_invested:0,matured_unpaid:0,
        linked_leads:0,sold_linked_leads:0,allocated_sales:0,linked_gross_sales:0,
        allocated_revenue:0,paid_to_investor:0,payable_now:0,ad_allocated:0,ad_spent:0,
        ad_remaining:0,funds_available_for_ads:0,cycles:[],leadIds:new Set(),
      });
    }
    const investor=investorsMap.get(row.user_id);
    investor.investment_count+=1;
    if(!row.is_reinvestment)investor.total_invested+=row.amount;
    if(row.status==='active'&&!row.is_reinvestment)investor.active_invested+=row.amount;
    if(row.payable_now>0)investor.matured_unpaid+=1;
    investor.payable_now+=row.payable_now;
    investor.ad_allocated+=row.current_ad_allocation;
    investor.ad_spent+=row.ad_spent;
    investor.ad_remaining+=row.ad_remaining;
    investor.funds_available_for_ads+=row.funds_available_for_ads;
    investor.allocated_sales+=row.allocated_sales;
    investor.allocated_revenue+=row.allocated_revenue;
    investor.paid_to_investor+=row.paid_to_investor;
    for(const leadId of row.linked_lead_ids)investor.leadIds.add(leadId);
    investor.cycles.push(row);
  }
  return Array.from(investorsMap.values()).map(item=>({
    ...item,
    linked_leads:item.leadIds.size,
    sold_linked_leads:0,
    linked_gross_sales:0,
    total_invested:Number(item.total_invested.toFixed(2)),
    active_invested:Number(item.active_invested.toFixed(2)),
    allocated_revenue:Number(item.allocated_revenue.toFixed(2)),
    paid_to_investor:Number(item.paid_to_investor.toFixed(2)),
    payable_now:Number(item.payable_now.toFixed(2)),
    ad_allocated:Number(item.ad_allocated.toFixed(2)),
    ad_spent:Number(item.ad_spent.toFixed(2)),
    ad_remaining:Number(item.ad_remaining.toFixed(2)),
    funds_available_for_ads:Number(item.funds_available_for_ads.toFixed(2)),
    investments:item.cycles,
    _leadIds:[...item.leadIds],
    leadIds:undefined,
  }));
}

async function getDashboard({search='',status='all',industryId='',page=1,limit=30}={}){
  const values=[];
  const where=["x.status <> 'cancelled'"];
  const q=String(search||'').trim();
  if(q){
    values.push(`%${q}%`);
    where.push(`(u.name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR i.name ILIKE $${values.length} OR COALESCE(s.name,'') ILIKE $${values.length} OR COALESCE(c.name,'') ILIKE $${values.length})`);
  }
  if(status&&status!=='all'){
    values.push(status);
    where.push(`x.status=$${values.length}`);
  }
  if(industryId){
    const parsed=Number(industryId);
    if(Number.isInteger(parsed)&&parsed>0){
      values.push(parsed);
      where.push(`x.industry_id=$${values.length}`);
    }
  }
  const safeLimit=Math.min(Math.max(Number(limit)||30,1),100);
  const safePage=Math.max(Number(page)||1,1);
  const whereSql=where.join(' AND ');

  const scopeRows=(await pool.query(`
    WITH current_cycles AS (
      SELECT DISTINCT ON (ic.user_id) ic.user_id,ic.id
      FROM investment_cycles ic
      ORDER BY ic.user_id,
        CASE WHEN ic.status IN ('ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS') THEN 0 ELSE 1 END,
        ic.id DESC
    )
    SELECT x.user_id,cc.id AS cycle_id,MAX(x.created_at) AS latest_created
    FROM investments x
    JOIN current_cycles cc ON cc.user_id=x.user_id AND cc.id=x.cycle_id
    JOIN users u ON u.id=x.user_id
    JOIN industries i ON i.id=x.industry_id
    LEFT JOIN states s ON s.id=x.state_id
    LEFT JOIN cities c ON c.id=x.city_id
    WHERE ${whereSql}
    GROUP BY x.user_id,cc.id
    ORDER BY MAX(x.created_at) DESC,x.user_id DESC
  `,values)).rows.map(row=>({userId:Number(row.user_id),cycleId:Number(row.cycle_id),latestCreated:row.latest_created}));

  const total=scopeRows.length;
  const pages=Math.max(1,Math.ceil(total/safeLimit));
  const pageValue=Math.min(safePage,pages);
  const pageScopes=scopeRows.slice((pageValue-1)*safeLimit,pageValue*safeLimit);
  if(!pageScopes.length)return{stats:{investors:total},investors:[],items:[],pagination:{page:pageValue,limit:safeLimit,total,pages},summaryScopes:scopeRows};

  const pageUserIds=pageScopes.map(row=>row.userId);
  const pageCycleIds=pageScopes.map(row=>row.cycleId);
  const rows=(await pool.query(`
    WITH page_scope AS (
      SELECT * FROM UNNEST($1::int[],$2::int[]) AS p(user_id,cycle_id)
    )
    SELECT
      x.id,x.user_id,x.cycle_id,u.name AS user_name,u.email AS user_email,
      x.industry_id,i.name AS industry_name,x.state_id,s.name AS state_name,
      x.city_id,c.name AS city_name,x.amount,x.amount_in_ads,x.ad_spend_status,
      x.status,x.starts_at,x.matures_at,x.maturity_days,x.created_at,x.updated_at,
      x.reinvestment_enabled,x.parent_investment_id,
      COALESCE(a.allocated_revenue,0)::numeric AS allocated_revenue,
      COALESCE(a.allocated_sales,0)::int AS allocated_sales,
      COALESCE(x.payout_amount,0)::numeric AS paid_to_investor,
      COALESCE(adtotal.total_spent,0)::numeric AS ad_spent,
      COALESCE(ad.current_spent,0)::numeric AS current_ad_spent,
      COALESCE(ad.current_remaining,0)::numeric AS ad_remaining,
      COALESCE(ad.current_allocation,0)::numeric AS current_ad_allocation,
      COALESCE(adtotal.total_allocated,0)::numeric AS total_ad_allocated,
      COALESCE(ls.linked_leads,0)::int AS linked_leads,
      COALESCE(ls.sold_linked_leads,0)::int AS sold_linked_leads,
      COALESCE(ls.linked_paid_sales,0)::int AS linked_paid_sales,
      COALESCE(ls.linked_gross_sales,0)::numeric AS linked_gross_sales,
      COALESCE(ls.linked_lead_ids,'[]'::json) AS linked_lead_ids
    FROM page_scope ps
    JOIN investments x ON x.user_id=ps.user_id AND x.cycle_id=ps.cycle_id AND x.status<>'cancelled'
    JOIN users u ON u.id=x.user_id
    JOIN industries i ON i.id=x.industry_id
    LEFT JOIN states s ON s.id=x.state_id
    LEFT JOIN cities c ON c.id=x.city_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(ira.allocated_amount),0) AS allocated_revenue,
             COUNT(DISTINCT ira.lead_purchase_id)::int AS allocated_sales
      FROM investment_revenue_allocations ira WHERE ira.investment_id=x.id
    ) a ON TRUE
    LEFT JOIN LATERAL (
      SELECT COALESCE((SELECT SUM(ias.amount) FROM investment_ad_spends ias WHERE ias.investment_id=x.id),0) AS total_spent,
             COALESCE((SELECT SUM(a2.amount) FROM investment_ad_allocations a2 WHERE a2.investment_id=x.id),0) AS total_allocated
    ) adtotal ON TRUE
    LEFT JOIN LATERAL (
      SELECT aa.amount AS current_allocation,
             COALESCE((SELECT SUM(s2.amount) FROM investment_ad_spends s2 WHERE s2.allocation_id=aa.id),0) AS current_spent,
             GREATEST(0,aa.amount-COALESCE((SELECT SUM(s3.amount) FROM investment_ad_spends s3 WHERE s3.allocation_id=aa.id),0)) AS current_remaining
      FROM investment_ad_allocations aa
      WHERE aa.investment_id=x.id AND aa.status IN ('allocated','spending')
      ORDER BY aa.id DESC LIMIT 1
    ) ad ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(DISTINCT l.id)::int AS linked_leads,
             COUNT(DISTINCT l.id) FILTER (WHERE EXISTS (SELECT 1 FROM lead_purchases lp2 WHERE lp2.lead_id=l.id AND lp2.status='paid'))::int AS sold_linked_leads,
             COUNT(DISTINCT lp.id) FILTER (WHERE lp.status='paid')::int AS linked_paid_sales,
             COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0) AS linked_gross_sales,
             COALESCE(json_agg(DISTINCT l.id) FILTER (WHERE l.id IS NOT NULL),'[]'::json) AS linked_lead_ids
      FROM leads l
      LEFT JOIN lead_purchases lp ON lp.lead_id=l.id
      WHERE l.investor_user_id=x.user_id AND l.cycle_id=x.cycle_id
    ) ls ON TRUE
    ORDER BY x.created_at DESC,x.id DESC
  `,[pageUserIds,pageCycleIds])).rows.map(normalizeRow);

  const investors=buildInvestors(rows);
  const order=new Map(pageScopes.map((row,index)=>[row.userId,index]));
  investors.sort((a,b)=>(order.get(Number(a.user_id))??999999)-(order.get(Number(b.user_id))??999999));

  const allLeadIds=[...new Set(investors.flatMap(investor=>investor._leadIds))];
  if(allLeadIds.length){
    const metricRows=(await pool.query(`
      SELECT l.investor_user_id AS user_id,
        COUNT(DISTINCT l.id) FILTER (WHERE EXISTS (SELECT 1 FROM lead_purchases paid WHERE paid.lead_id=l.id AND paid.status='paid'))::int AS sold_linked_leads,
        COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0)::numeric AS linked_gross_sales
      FROM leads l
      LEFT JOIN lead_purchases lp ON lp.lead_id=l.id
      WHERE l.id=ANY($1::int[])
      GROUP BY l.investor_user_id
    `,[allLeadIds])).rows;
    const metrics=new Map(metricRows.map(row=>[Number(row.user_id),row]));
    for(const investor of investors){
      const metric=metrics.get(Number(investor.user_id));
      investor.sold_linked_leads=Number(metric?.sold_linked_leads||0);
      investor.linked_gross_sales=Number(metric?.linked_gross_sales||0);
    }
  }
  for(const investor of investors)delete investor._leadIds;

  return{
    stats:{investors:total,investment_cycles:rows.length},
    investors,items:rows,
    pagination:{page:pageValue,limit:safeLimit,total,pages},
    summaryScopes:scopeRows
  };
}

module.exports={getDashboard};
