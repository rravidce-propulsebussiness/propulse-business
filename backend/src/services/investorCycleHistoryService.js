const pool = require('../config/database');
const statementService = require('./investmentCycleStatementService');

async function list(userId) {
  const uid = Number(userId);
  const rows = (await pool.query(`
    SELECT ic.id,ic.user_id,ic.status,ic.auto_invest,ic.started_at,ic.maturity_at,ic.exit_requested_at,ic.closed_at,ic.admin_closed_reason,ic.exit_reason,
      COALESCE((SELECT SUM(i.amount) FROM investments i WHERE i.cycle_id=ic.id AND i.status<>'cancelled' AND i.parent_investment_id IS NULL),0)::numeric AS actual_investment,
      COALESCE((SELECT SUM(i.amount) FROM investments i WHERE i.cycle_id=ic.id AND i.status<>'cancelled' AND i.parent_investment_id IS NOT NULL),0)::numeric AS reinvestment,
      COALESCE((SELECT SUM(i.amount) FROM investments i WHERE i.cycle_id=ic.id AND i.status<>'cancelled'),0)::numeric AS total_invested,
      COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s JOIN investments i ON i.id=s.investment_id WHERE i.user_id=$1 AND i.cycle_id=ic.id AND i.status<>'cancelled'),0)::numeric AS ad_spent,
      COALESCE((SELECT SUM(lp.amount) FROM lead_purchases lp JOIN leads l ON l.id=lp.lead_id WHERE l.investor_user_id=$1 AND l.cycle_id=ic.id AND lp.status='paid'),0)::numeric AS gross_revenue,
      COALESCE((SELECT SUM(ira.allocated_amount) FROM investment_revenue_allocations ira JOIN investments i ON i.id=ira.investment_id WHERE i.user_id=$1 AND i.cycle_id=ic.id AND i.status<>'cancelled'),0)::numeric AS investor_earnings,
      COALESCE((SELECT COUNT(*) FROM leads l WHERE l.investor_user_id=$1 AND l.cycle_id=ic.id),0)::int AS linked_leads,
      COALESCE((SELECT COUNT(*) FROM leads l WHERE l.investor_user_id=$1 AND l.cycle_id=ic.id AND EXISTS (SELECT 1 FROM lead_purchases lp WHERE lp.lead_id=l.id AND lp.status='paid')),0)::int AS sold_leads
    FROM investment_cycles ic WHERE ic.user_id=$1
    ORDER BY CASE WHEN ic.status IN ('ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS') THEN 0 ELSE 1 END,ic.id DESC
  `,[uid])).rows;
  return rows.map(r=>({...r,id:Number(r.id),user_id:Number(r.user_id),auto_invest:Boolean(r.auto_invest),actual_investment:Number(r.actual_investment||0),reinvestment:Number(r.reinvestment||0),total_invested:Number(r.total_invested||0),ad_spent:Number(r.ad_spent||0),gross_revenue:Number(r.gross_revenue||0),investor_earnings:Number(r.investor_earnings||0),linked_leads:Number(r.linked_leads||0),sold_leads:Number(r.sold_leads||0)}));
}

async function getCycleHistory(userId,cycleId){
  const uid=Number(userId),cid=Number(cycleId);
  const statement=await statementService.getCycleStatement(uid,cid);
  const investments=(await pool.query(`SELECT i.id,i.amount,i.status,i.created_at,i.updated_at,i.parent_investment_id,i.reinvestment_enabled,COALESCE((SELECT SUM(s.amount) FROM investment_ad_spends s WHERE s.investment_id=i.id),0)::numeric AS ad_spent FROM investments i WHERE i.user_id=$1 AND i.cycle_id=$2 AND i.status<>'cancelled' ORDER BY i.created_at ASC,i.id ASC`,[uid,cid])).rows.map(r=>({...r,id:Number(r.id),amount:Number(r.amount||0),ad_spent:Number(r.ad_spent||0),parent_investment_id:r.parent_investment_id==null?null:Number(r.parent_investment_id),reinvestment_enabled:Boolean(r.reinvestment_enabled)}));
  const adSpends=(await pool.query(`SELECT s.id,s.amount,s.spend_date,s.created_at,s.platform,s.campaign,s.reference,s.notes,i.id AS investment_id FROM investment_ad_spends s JOIN investments i ON i.id=s.investment_id WHERE i.user_id=$1 AND i.cycle_id=$2 AND i.status<>'cancelled' ORDER BY COALESCE(s.created_at,s.spend_date) ASC,s.id ASC`,[uid,cid])).rows.map(r=>({...r,id:Number(r.id),investment_id:Number(r.investment_id),amount:Number(r.amount||0),occurred_at:r.created_at||r.spend_date}));
  // investor_payout_requests uses requested_at (not created_at) as its request timestamp.
  const payouts=(await pool.query(`SELECT id,amount,status,requested_at,processed_at,transfer_reference FROM investor_payout_requests WHERE user_id=$1 AND cycle_id=$2 ORDER BY requested_at ASC,id ASC`,[uid,cid])).rows.map(r=>({...r,id:Number(r.id),amount:Number(r.amount||0),status:r.status,requested_at:r.requested_at,processed_at:r.processed_at,transfer_reference:r.transfer_reference,occurred_at:r.processed_at||r.requested_at}));
  const events=[];
  for(const i of investments) events.push({type:i.parent_investment_id?'reinvestment':'investment',amount:i.amount,occurred_at:i.created_at,description:i.parent_investment_id?`Reinvestment #${i.id} added`:`Investment #${i.id} added`,reference_id:i.id});
  for(const s of adSpends) events.push({type:'ad_spend',amount:-s.amount,occurred_at:s.occurred_at,description:`Ads spent${s.platform?` · ${s.platform}`:''}`,reference_id:s.id});
  for(const s of statement.sales_detail||[]) events.push({type:'lead_sale',amount:Number(s.investor_earnings||0),occurred_at:s.sold_at,description:`Lead #${s.lead_id} sold · ${s.shares===1?'1 single share':`${s.shares} shared shares`}`,reference_id:s.purchase_id,gross_amount:Number(s.amount||0),shares:Number(s.shares||1),investor_earnings:Number(s.investor_earnings||0)});
  for(const p of payouts) if(p.status==='paid') events.push({type:'payout',amount:-p.amount,occurred_at:p.occurred_at,description:`Withdrawal paid${p.transfer_reference?` · ${p.transfer_reference}`:''}`,reference_id:p.id});
  events.sort((a,b)=>new Date(a.occurred_at||0)-new Date(b.occurred_at||0)||(Number(a.reference_id||0)-Number(b.reference_id||0)));
  let balance=0; for(const e of events){balance+=Number(e.amount||0);e.balance_after=Number(balance.toFixed(2));}
  return {...statement,investments,ad_spends:adSpends,payout_requests:payouts,events};
}
module.exports={list,getCycleHistory};
