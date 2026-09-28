const pool=require('../config/database');

const CACHE_TTL_MS=60*1000;
let cached=null;
let cachedAt=0;

const n=value=>Number(value||0);
const money=value=>Number(n(value).toFixed(2));

function issue(type,severity,title,description,rows=[]){
  return{type,severity,title,description,count:rows.length,items:rows};
}

async function walletBalanceIssues(){
  const rows=(await pool.query(`
    SELECT w.user_id,u.email,w.balance::numeric AS stored_balance,
           COALESCE(last_tx.balance_after,0)::numeric AS ledger_balance,
           ABS(w.balance-COALESCE(last_tx.balance_after,0))::numeric AS difference
      FROM wallets w
      JOIN users u ON u.id=w.user_id
      LEFT JOIN LATERAL (
        SELECT wt.balance_after
          FROM wallet_transactions wt
         WHERE wt.wallet_id=w.id AND wt.status='completed'
         ORDER BY wt.created_at DESC,wt.id DESC
         LIMIT 1
      ) last_tx ON TRUE
     WHERE ABS(w.balance-COALESCE(last_tx.balance_after,0))>0.009
     ORDER BY ABS(w.balance-COALESCE(last_tx.balance_after,0)) DESC,w.user_id
     LIMIT 50
  `)).rows;
  return rows.map(row=>({userId:Number(row.user_id),email:row.email,storedBalance:money(row.stored_balance),ledgerBalance:money(row.ledger_balance),difference:money(row.difference)}));
}

async function approvedTopupIssues(){
  const rows=(await pool.query(`
    SELECT t.id,t.user_id,u.email,t.amount::numeric,
           COUNT(wt.id)::int AS credit_count,
           COALESCE(SUM(wt.amount),0)::numeric AS credited_amount
      FROM wallet_topups t
      JOIN users u ON u.id=t.user_id
      LEFT JOIN wallet_transactions wt
        ON wt.reference_type='wallet_topup'
       AND wt.reference_id=t.id
       AND wt.type='credit'
       AND wt.status='completed'
     WHERE t.status='approved'
     GROUP BY t.id,t.user_id,u.email,t.amount
    HAVING COUNT(wt.id)<>1 OR ABS(COALESCE(SUM(wt.amount),0)-t.amount)>0.009
     ORDER BY t.id DESC
     LIMIT 50
  `)).rows;
  return rows.map(row=>({topupId:Number(row.id),userId:Number(row.user_id),email:row.email,amount:money(row.amount),creditCount:Number(row.credit_count),creditedAmount:money(row.credited_amount)}));
}

async function paymentSplitIssues(){
  const rows=(await pool.query(`
    SELECT id,user_id,amount::numeric,wallet_amount::numeric,external_amount::numeric,status
      FROM payments
     WHERE ABS(amount-COALESCE(wallet_amount,0)-COALESCE(external_amount,0))>0.009
     ORDER BY id DESC
     LIMIT 50
  `)).rows;
  return rows.map(row=>({paymentId:Number(row.id),userId:Number(row.user_id),status:row.status,amount:money(row.amount),walletAmount:money(row.wallet_amount),externalAmount:money(row.external_amount)}));
}

async function paymentWalletDebitIssues(){
  const rows=(await pool.query(`
    SELECT p.id,p.user_id,p.wallet_amount::numeric,
           COUNT(wt.id)::int AS debit_count,
           COALESCE(SUM(wt.amount),0)::numeric AS debited_amount
      FROM payments p
      LEFT JOIN wallet_transactions wt
        ON wt.payment_id=p.id
       AND wt.type='debit'
       AND wt.status='completed'
     WHERE COALESCE(p.wallet_amount,0)>0
     GROUP BY p.id,p.user_id,p.wallet_amount
    HAVING COUNT(wt.id)<>1 OR ABS(COALESCE(SUM(wt.amount),0)-p.wallet_amount)>0.009
     ORDER BY p.id DESC
     LIMIT 50
  `)).rows;
  return rows.map(row=>({paymentId:Number(row.id),userId:Number(row.user_id),walletAmount:money(row.wallet_amount),debitCount:Number(row.debit_count),debitedAmount:money(row.debited_amount)}));
}

async function leadPartnerPayoutIssues(){
  const rows=(await pool.query(`
    SELECT r.id,r.partner_id,r.user_id,r.status,r.amount::numeric,
           COALESCE(SUM(i.amount) FILTER(WHERE i.status='reserved'),0)::numeric AS reserved_amount,
           COALESCE(SUM(i.amount) FILTER(WHERE i.status='paid'),0)::numeric AS paid_amount,
           COALESCE(SUM(i.amount) FILTER(WHERE i.status='released'),0)::numeric AS released_amount
      FROM lead_partner_payout_requests r
      LEFT JOIN lead_partner_payout_items i ON i.payout_id=r.id
     GROUP BY r.id,r.partner_id,r.user_id,r.status,r.amount
    HAVING (r.status='pending' AND ABS(COALESCE(SUM(i.amount) FILTER(WHERE i.status='reserved'),0)-r.amount)>0.009)
        OR (r.status='paid' AND ABS(COALESCE(SUM(i.amount) FILTER(WHERE i.status='paid'),0)-r.amount)>0.009)
        OR (r.status='rejected' AND COALESCE(SUM(i.amount) FILTER(WHERE i.status<>'released'),0)>0.009)
     ORDER BY r.id DESC
     LIMIT 50
  `)).rows;
  return rows.map(row=>({payoutId:Number(row.id),partnerId:Number(row.partner_id),userId:Number(row.user_id),status:row.status,amount:money(row.amount),reservedAmount:money(row.reserved_amount),paidAmount:money(row.paid_amount),releasedAmount:money(row.released_amount)}));
}

async function leadPartnerEarningIssues(){
  const rows=(await pool.query(`
    WITH totals AS (
      SELECT e.id,e.partner_id,e.user_id,e.status,e.earning_amount,
             COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.earning_id=e.id),0) AS adjusted,
             COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='reserved' AND r.status='pending'),0) AS reserved,
             COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='paid' AND r.status='paid'),0) AS paid
        FROM lead_partner_earnings e
       WHERE e.status IN ('available','paid')
    )
    SELECT *
      FROM totals
     WHERE adjusted+reserved+paid>earning_amount+0.009
        OR (status='paid' AND adjusted+paid<earning_amount-0.009)
     ORDER BY id DESC
     LIMIT 50
  `)).rows;
  return rows.map(row=>({earningId:Number(row.id),partnerId:Number(row.partner_id),userId:Number(row.user_id),status:row.status,earningAmount:money(row.earning_amount),adjusted:money(row.adjusted),reserved:money(row.reserved),paid:money(row.paid)}));
}

async function leadPartnerEvidenceIssues(){
  const rows=(await pool.query(`
    SELECT id,partner_id,user_id,amount::numeric
      FROM lead_partner_payout_requests
     WHERE status='paid'
       AND (NULLIF(BTRIM(transfer_reference),'') IS NULL
         OR NULLIF(BTRIM(proof_url),'') IS NULL
         OR processed_at IS NULL
         OR paid_at IS NULL)
     ORDER BY id DESC
     LIMIT 50
  `)).rows;
  return rows.map(row=>({payoutId:Number(row.id),partnerId:Number(row.partner_id),userId:Number(row.user_id),amount:money(row.amount)}));
}

async function investorEvidenceIssues(){
  const rows=(await pool.query(`
    SELECT id,user_id,amount::numeric
      FROM investor_payout_requests
     WHERE status='paid'
       AND (NULLIF(BTRIM(transfer_reference),'') IS NULL
         OR NULLIF(BTRIM(proof_url),'') IS NULL
         OR processed_at IS NULL)
     ORDER BY id DESC
     LIMIT 50
  `)).rows;
  return rows.map(row=>({requestId:Number(row.id),userId:Number(row.user_id),amount:money(row.amount)}));
}

async function investorReferenceIssues(){
  const rows=(await pool.query(`
    WITH refs AS (
      SELECT 'request'::text AS source,id::bigint AS source_id,user_id,LOWER(BTRIM(transfer_reference)) AS ref
        FROM investor_payout_requests
       WHERE NULLIF(BTRIM(transfer_reference),'') IS NOT NULL
      UNION ALL
      SELECT 'investment'::text AS source,id::bigint AS source_id,user_id,LOWER(BTRIM(payout_transfer_reference)) AS ref
        FROM investments
       WHERE NULLIF(BTRIM(payout_transfer_reference),'') IS NOT NULL
    ),
    duplicates AS (
      SELECT ref,COUNT(*)::int AS occurrences,ARRAY_AGG(source||':'||source_id ORDER BY source,source_id) AS sources
        FROM refs
       GROUP BY ref
      HAVING COUNT(*)>1
    )
    SELECT RIGHT(ref,4) AS reference_hint,occurrences,sources
      FROM duplicates
     ORDER BY occurrences DESC,reference_hint
     LIMIT 50
  `)).rows;
  return rows.map(row=>({referenceHint:'••••'+String(row.reference_hint||''),occurrences:Number(row.occurrences),sources:row.sources||[]}));
}

async function investorCommitmentIssues(){
  const rows=(await pool.query(`
    WITH scope AS (
      SELECT DISTINCT user_id FROM investments
      UNION
      SELECT DISTINCT user_id FROM investor_payout_requests
    ),
    totals AS (
      SELECT s.user_id,
        COALESCE((SELECT SUM(i.amount) FROM investments i WHERE i.user_id=s.user_id AND i.status IN ('active','matured','paid') AND i.parent_investment_id IS NULL),0)::numeric AS capital,
        COALESCE((SELECT SUM(sp.amount) FROM investment_ad_spends sp JOIN investments i ON i.id=sp.investment_id WHERE i.user_id=s.user_id AND i.status<>'cancelled'),0)::numeric AS ad_spent,
        COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a JOIN investments i ON i.id=a.investment_id WHERE i.user_id=s.user_id AND i.status<>'cancelled' AND COALESCE(i.reinvestment_enabled,FALSE)=TRUE),0)::numeric AS auto_earnings,
        COALESCE((SELECT SUM(a.allocated_amount) FROM investment_revenue_allocations a JOIN investments i ON i.id=a.investment_id WHERE i.user_id=s.user_id AND i.status<>'cancelled' AND COALESCE(i.reinvestment_enabled,FALSE)=FALSE),0)::numeric AS non_auto_earnings,
        COALESCE((SELECT SUM(i.payout_amount) FROM investments i WHERE i.user_id=s.user_id AND i.status='paid' AND COALESCE(i.reinvestment_enabled,FALSE)=FALSE),0)::numeric AS settled_non_auto,
        COALESCE((SELECT SUM(r.amount) FROM investor_payout_requests r WHERE r.user_id=s.user_id AND r.status='paid'),0)::numeric AS transferred,
        COALESCE((SELECT SUM(r.amount) FROM investor_payout_requests r WHERE r.user_id=s.user_id AND r.status='pending'),0)::numeric AS reserved
      FROM scope s
    ),
    calculated AS (
      SELECT *,
        GREATEST(0,auto_earnings-LEAST(auto_earnings,GREATEST(0,ad_spent-capital))) AS auto_available,
        GREATEST(0,non_auto_earnings-settled_non_auto) AS non_auto_available
      FROM totals
    )
    SELECT user_id,capital,ad_spent,auto_earnings,non_auto_earnings,settled_non_auto,transferred,reserved,
           (auto_available+non_auto_available)::numeric AS earnings_source,
           (transferred+reserved)::numeric AS payout_commitment
      FROM calculated
     WHERE transferred+reserved>auto_available+non_auto_available+0.009
        OR ad_spent>capital+auto_earnings+0.009
     ORDER BY GREATEST(transferred+reserved-(auto_available+non_auto_available),ad_spent-(capital+auto_earnings)) DESC
     LIMIT 50
  `)).rows;
  return rows.map(row=>({userId:Number(row.user_id),capital:money(row.capital),adSpent:money(row.ad_spent),autoEarnings:money(row.auto_earnings),nonAutoEarnings:money(row.non_auto_earnings),settledNonAuto:money(row.settled_non_auto),transferred:money(row.transferred),reserved:money(row.reserved),earningsSource:money(row.earnings_source),payoutCommitment:money(row.payout_commitment)}));
}

async function overview(){
  const row=(await pool.query(`
    SELECT
      COALESCE((SELECT SUM(balance) FROM wallets),0)::numeric AS wallet_balance,
      COALESCE((SELECT SUM(amount) FROM payments WHERE status='paid'),0)::numeric AS paid_payments,
      COALESCE((SELECT SUM(amount) FROM wallet_topups WHERE status='approved'),0)::numeric AS approved_topups,
      COALESCE((SELECT SUM(earning_amount) FROM lead_partner_earnings WHERE status<>'reversed'),0)::numeric AS partner_earnings,
      COALESCE((SELECT SUM(amount) FROM lead_partner_payout_requests WHERE status='paid'),0)::numeric AS partner_paid,
      COALESCE((SELECT SUM(allocated_amount) FROM investment_revenue_allocations),0)::numeric AS investor_allocated,
      COALESCE((SELECT SUM(amount) FROM investor_payout_requests WHERE status='paid'),0)::numeric AS investor_paid
  `)).rows[0]||{};
  return{
    walletBalance:money(row.wallet_balance),
    paidPayments:money(row.paid_payments),
    approvedTopups:money(row.approved_topups),
    partnerEarnings:money(row.partner_earnings),
    partnerPaid:money(row.partner_paid),
    investorAllocated:money(row.investor_allocated),
    investorPaid:money(row.investor_paid)
  };
}

async function scan(){
  const [
    walletBalances,approvedTopups,paymentSplits,paymentWalletDebits,
    partnerPayouts,partnerEarnings,partnerEvidence,
    investorEvidence,investorReferences,investorCommitments,totals
  ]=await Promise.all([
    walletBalanceIssues(),approvedTopupIssues(),paymentSplitIssues(),paymentWalletDebitIssues(),
    leadPartnerPayoutIssues(),leadPartnerEarningIssues(),leadPartnerEvidenceIssues(),
    investorEvidenceIssues(),investorReferenceIssues(),investorCommitmentIssues(),overview()
  ]);

  const checks=[
    issue('wallet_balance','critical','Wallet balance drift','Stored wallet balance differs from the latest completed wallet ledger balance.',walletBalances),
    issue('approved_topup','critical','Approved top-up ledger mismatch','Approved wallet top-up is missing its single matching wallet credit or the amount differs.',approvedTopups),
    issue('payment_split','critical','Payment split mismatch','Payment total does not equal wallet amount plus external amount.',paymentSplits),
    issue('payment_wallet_debit','critical','Payment wallet debit mismatch','Payment says wallet funds were used but the wallet debit ledger does not match.',paymentWalletDebits),
    issue('partner_payout_allocation','critical','Lead Partner payout allocation mismatch','Payout request amount does not reconcile with reserved/paid/released earning items.',partnerPayouts),
    issue('partner_earning_allocation','critical','Lead Partner earning allocation mismatch','Earning status or allocated deductions/payouts do not reconcile with the earning amount.',partnerEarnings),
    issue('partner_payout_evidence','warning','Lead Partner payout evidence missing','A paid Lead Partner payout is missing transfer reference, proof, or processing timestamps.',partnerEvidence),
    issue('investor_payout_evidence','warning','Investor payout evidence missing','A paid investor transfer request is missing transfer reference, proof, or processing timestamp.',investorEvidence),
    issue('investor_transfer_reference','critical','Investor transfer reference reused','The same normalized transfer reference appears on more than one investor payout/settlement record.',investorReferences),
    issue('investor_commitment','critical','Investor funds overcommitted','Paid or pending investor withdrawals exceed recomputed earnings sources, or ad spend exceeds available capital plus auto-invest earnings.',investorCommitments)
  ];
  const critical=checks.filter(x=>x.severity==='critical').reduce((sum,x)=>sum+x.count,0);
  const warnings=checks.filter(x=>x.severity==='warning').reduce((sum,x)=>sum+x.count,0);
  return{
    status:critical>0?'critical':warnings>0?'warning':'clean',
    checkedAt:new Date().toISOString(),
    critical,
    warnings,
    totalIssues:critical+warnings,
    overview:totals,
    checks
  };
}

async function getFinancialIntegrity({force=false}={}){
  const now=Date.now();
  if(!force&&cached&&now-cachedAt<CACHE_TTL_MS)return{...cached,cached:true,cacheAgeSeconds:Math.floor((now-cachedAt)/1000)};
  const result=await scan();
  cached=result;
  cachedAt=Date.now();
  return{...result,cached:false,cacheAgeSeconds:0};
}

module.exports={getFinancialIntegrity};
