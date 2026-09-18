const pool=require('../src/config/database');

const requiredTables=[
  'lead_partner_earnings',
  'lead_partner_earning_adjustments',
  'lead_partner_earning_adjustment_allocations',
  'lead_partner_payout_requests',
  'lead_partner_payout_items',
];

async function query(sql,params=[]){return (await pool.query(sql,params)).rows}

async function main(){
  const missing=[];
  for(const table of requiredTables){
    const rows=await query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1",
      [table]
    );
    if(!rows.length)missing.push(table);
  }
  if(missing.length)throw new Error('Required Lead Partner ledger tables are missing: '+missing.join(', '));

  const checks={};
  checks.duplicatePayoutItems=await query(
    "SELECT payout_id,earning_id,COUNT(*) AS count FROM lead_partner_payout_items GROUP BY payout_id,earning_id HAVING COUNT(*)>1"
  );
  checks.overAllocatedEarnings=await query(
    "SELECT e.id,e.earning_amount,COALESCE(a.recovery,0) AS recovery,COALESCE(p.paid_reserved,0) AS paid_reserved FROM lead_partner_earnings e LEFT JOIN (SELECT earning_id,SUM(amount) recovery FROM lead_partner_earning_adjustment_allocations GROUP BY earning_id) a ON a.earning_id=e.id LEFT JOIN (SELECT earning_id,SUM(amount) paid_reserved FROM lead_partner_payout_items WHERE status IN ('reserved','paid') GROUP BY earning_id) p ON p.earning_id=e.id WHERE COALESCE(a.recovery,0)+COALESCE(p.paid_reserved,0)>e.earning_amount+0.001"
  );
  checks.invalidEarningStatuses=await query(
    "SELECT e.id,e.status,e.earning_amount,COALESCE(a.recovery,0) recovery,COALESCE(p.paid_reserved,0) paid_reserved FROM lead_partner_earnings e LEFT JOIN (SELECT earning_id,SUM(amount) recovery FROM lead_partner_earning_adjustment_allocations GROUP BY earning_id) a ON a.earning_id=e.id LEFT JOIN (SELECT earning_id,SUM(amount) paid_reserved FROM lead_partner_payout_items WHERE status IN ('reserved','paid') GROUP BY earning_id) p ON p.earning_id=e.id WHERE (e.status='paid' AND COALESCE(p.paid_reserved,0)+COALESCE(a.recovery,0)<e.earning_amount-0.001) OR (e.status='reversed' AND COALESCE(p.paid_reserved,0)>0)"
  );
  checks.recoveryPartnerMismatches=await query(
    "SELECT a.id adjustment_id,a.partner_id adjustment_partner,e.id earning_id,e.partner_id earning_partner FROM lead_partner_earning_adjustments a JOIN lead_partner_earning_adjustment_allocations x ON x.adjustment_id=a.id JOIN lead_partner_earnings e ON e.id=x.earning_id WHERE a.partner_id<>e.partner_id OR a.user_id<>e.user_id"
  );
  checks.recoveryOrphans=await query(
    "SELECT a.id,a.earning_id,a.lead_purchase_id FROM lead_partner_earning_adjustments a LEFT JOIN lead_partner_earnings e ON e.id=a.earning_id WHERE a.type='fake_lead_recovery' AND (a.earning_id IS NULL OR e.id IS NULL OR a.lead_purchase_id IS NULL OR e.lead_purchase_id<>a.lead_purchase_id)"
  );
  checks.recoveryAgainstReversedEarnings=await query(
    "SELECT x.id allocation_id,x.earning_id,e.status FROM lead_partner_earning_adjustment_allocations x JOIN lead_partner_earnings e ON e.id=x.earning_id WHERE e.status='reversed'"
  );
  checks.invalidRecoveryStates=await query(
    "SELECT a.id,a.amount,a.status,COALESCE(x.allocated,0) allocated FROM lead_partner_earning_adjustments a LEFT JOIN (SELECT adjustment_id,SUM(amount) allocated FROM lead_partner_earning_adjustment_allocations GROUP BY adjustment_id) x ON x.adjustment_id=a.id WHERE (a.status='recovered' AND COALESCE(x.allocated,0)<a.amount-0.001) OR (a.status='outstanding' AND COALESCE(x.allocated,0)>=a.amount-0.001)"
  );
  checks.payoutAmountMismatches=await query(
    "SELECT r.id,r.status,r.amount,COALESCE(x.allocated,0) allocated FROM lead_partner_payout_requests r LEFT JOIN (SELECT payout_id,SUM(amount) allocated FROM lead_partner_payout_items WHERE status IN ('reserved','paid') GROUP BY payout_id) x ON x.payout_id=r.id WHERE (r.status IN ('pending','paid') AND COALESCE(x.allocated,0)<>r.amount) OR (r.status='rejected' AND COALESCE(x.allocated,0)>0)"
  );
  checks.invalidItemParents=await query(
    "SELECT i.id,i.status,r.status AS payout_status FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE (i.status='reserved' AND r.status<>'pending') OR (i.status='paid' AND r.status<>'paid')"
  );
  checks.duplicateTransferReferences=await query(
    "SELECT transfer_reference,COUNT(*) AS count FROM lead_partner_payout_requests WHERE transfer_reference IS NOT NULL GROUP BY transfer_reference HAVING COUNT(*)>1"
  );

  const failures=Object.entries(checks).filter(([,rows])=>rows.length);
  for(const [name,rows] of failures)console.error('FAIL',name,JSON.stringify(rows));
  if(failures.length){
    process.exitCode=1;
    console.error('Lead Partner ledger integrity audit failed: '+failures.length+' check(s) returned violations.');
  }else{
    console.log('Lead Partner ledger integrity audit passed: all checks returned zero violations.');
  }
}

main().catch(error=>{
  console.error('Lead Partner ledger audit failed:',error.message);
  process.exitCode=1;
}).finally(()=>pool.end());
