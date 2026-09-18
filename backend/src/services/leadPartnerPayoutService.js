const pool=require('../config/database');const payoutAccounts=require('./leadPartnerPayoutAccountService');
const money=v=>Number(Number(v||0).toFixed(2));
const MAX_PROOF_BYTES=6*1024*1024;
const err=(m,c)=>Object.assign(new Error(m),{code:c});
function amount(v){const n=money(v);if(!Number.isFinite(n)||n<=0)throw err('Withdrawal amount must be greater than zero.','INVALID_AMOUNT');return n}
function proof(v){const x=String(v||'').trim();if(!x)throw err('Transfer proof is required.','TRANSFER_PROOF_REQUIRED');const m=x.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i);if(!m)throw err('Transfer proof must be a PNG, JPG, or WebP image.','INVALID_TRANSFER_PROOF');const payload=m[2].replace(/\s/g,'');const bytes=Math.floor(payload.length*3/4)-(payload.endsWith('==')?2:payload.endsWith('=')?1:0);if(bytes>MAX_PROOF_BYTES)throw err('Transfer proof is too large.','TRANSFER_PROOF_TOO_LARGE');return x}
async function partner(userId,client=pool){const r=(await client.query(`SELECT lp.id,lp.user_id,lp.status,u.name,u.email FROM lead_partners lp JOIN users u ON u.id=lp.user_id WHERE lp.user_id=$1`,[Number(userId)])).rows[0];if(!r)throw err('Lead Partner profile not found.','PARTNER_NOT_FOUND');if(r.status!=='active')throw err('Lead Partner account is not active.','PARTNER_NOT_ACTIVE');return r}
async function balance(userId,client=pool,lock=false){const p=await partner(userId,client);const rows=(await client.query(`SELECT e.id,e.status,e.earning_amount,COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.earning_id=e.id),0) adjusted,COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='reserved' AND r.status='pending'),0) reserved,COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='paid' AND r.status='paid'),0) paid FROM lead_partner_earnings e WHERE e.partner_id=$1 AND e.status IN ('available','paid') ORDER BY e.created_at,e.id${lock?' FOR UPDATE':''}`,[p.id])).rows;const recovery=(await client.query(`SELECT COALESCE(SUM(amount),0) total,COALESCE(SUM(CASE WHEN status='outstanding' THEN amount-COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.adjustment_id=lead_partner_earning_adjustments.id),0) ELSE 0 END),0) outstanding FROM lead_partner_earning_adjustments WHERE partner_id=$1`,[p.id])).rows[0]||{};return{partner:p,available:money(rows.reduce((s,r)=>s+(r.status==='available'?Math.max(0,Number(r.earning_amount)-Number(r.adjusted)-Number(r.reserved)-Number(r.paid)):0),0)),reserved:money(rows.reduce((s,r)=>s+Number(r.reserved||0),0)),paid:money(rows.reduce((s,r)=>s+Number(r.paid||0),0)),totalEarned:money(rows.reduce((s,r)=>s+Number(r.earning_amount||0),0)),recoveryOutstanding:money(recovery.outstanding),recoveryTotal:money(recovery.total)}}
async function getFunds(userId){const b=await balance(userId);const account=await payoutAccounts.get(userId);const requests=(await pool.query(`SELECT id,amount,status,transfer_reference,notes,rejection_reason,requested_at,processed_at,paid_at,payout_method FROM lead_partner_payout_requests WHERE user_id=$1 ORDER BY requested_at DESC,id DESC LIMIT 200`,[Number(userId)])).rows;return{available:b.available,reserved:b.reserved,paid:b.paid,total_earned:b.totalEarned,recovery_outstanding:b.recoveryOutstanding,recovery_total:b.recoveryTotal,payout_account:account,requests:requests.map(r=>({...r,id:Number(r.id),amount:money(r.amount)}))}}
async function requestWithdrawal({userId,amount:raw,notes}){const requested=amount(raw),client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`lead-partner-withdrawal:${Number(userId)}`]);const p0=(await client.query('SELECT id FROM lead_partners WHERE user_id=$1 AND status=\'active\' FOR UPDATE',[Number(userId)])).rows[0];if(!p0)throw err('Lead Partner account is not active.','PARTNER_NOT_ACTIVE');const b=await balance(userId,client,true);const account=await payoutAccounts.getInternal(client,userId);if(!account)throw err('Add a Bank Account or UPI before requesting a withdrawal.','PAYOUT_ACCOUNT_REQUIRED');if(requested>b.available+0.001)throw err('Withdrawal amount exceeds available earnings after recovery adjustments.','INSUFFICIENT_FUNDS');const snapshot=account.method==='upi'?{method:'upi',upi_id:account.upi_id}:{method:'bank',account_holder_name:account.account_holder_name,account_number:account.account_number,ifsc_code:account.ifsc_code,bank_name:account.bank_name};const p=(await client.query(`INSERT INTO lead_partner_payout_requests(partner_id,user_id,payout_account_id,payout_method,payout_account_snapshot,amount,notes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[b.partner.id,Number(userId),account.id,account.method,snapshot,requested,String(notes||'').trim()||null])).rows[0];let remaining=requested;const earnings=(await client.query(`SELECT e.id,e.earning_amount,COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.earning_id=e.id),0) adjusted,COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='reserved' AND r.status='pending'),0) reserved,COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='paid' AND r.status='paid'),0) paid FROM lead_partner_earnings e WHERE e.partner_id=$1 AND e.status='available' ORDER BY e.created_at,e.id FOR UPDATE`,[b.partner.id])).rows;for(const e of earnings){if(remaining<=.001)break;const free=Math.max(0,Number(e.earning_amount)-Number(e.adjusted)-Number(e.reserved)-Number(e.paid));const a=money(Math.min(free,remaining));if(a<=0)continue;await client.query(`INSERT INTO lead_partner_payout_items(payout_id,earning_id,amount,status) VALUES($1,$2,$3,'reserved')`,[p.id,e.id,a]);remaining=money(remaining-a)}if(remaining>.001)throw err('Available earnings changed while creating the withdrawal. Please try again.','INSUFFICIENT_FUNDS');await client.query('COMMIT');return{...p,id:Number(p.id),amount:money(p.amount)}}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}
async function adminList({status='all',search=''}={}){const v=[],w=[];if(status!=='all'){v.push(String(status));w.push(`r.status=$${v.length}`)}if(String(search).trim()){v.push(`%${String(search).trim()}%`);w.push(`(u.name ILIKE $${v.length} OR u.email ILIKE $${v.length})`)}const rows=(await pool.query(`SELECT r.*,u.name user_name,u.email user_email,lp.status partner_status FROM lead_partner_payout_requests r JOIN users u ON u.id=r.user_id JOIN lead_partners lp ON lp.id=r.partner_id ${w.length?'WHERE '+w.join(' AND '):''} ORDER BY r.requested_at DESC,r.id DESC`,v)).rows;return rows.map(r=>({...r,id:Number(r.id),partner_id:Number(r.partner_id),user_id:Number(r.user_id),amount:money(r.amount),payout_account_id:r.payout_account_id?Number(r.payout_account_id):null}))}
async function adminProcess({requestId,adminId,action,transferReference,proofUrl,rejectionReason,notes}){const a=String(action||'').trim().toLowerCase();if(!['paid','reject'].includes(a))throw err('Invalid payout action.','INVALID_ACTION');const c=await pool.connect();try{await c.query('BEGIN');const r=(await c.query('SELECT * FROM lead_partner_payout_requests WHERE id=$1 FOR UPDATE',[Number(requestId)])).rows[0];if(!r)throw err('Payout request not found.','NOT_FOUND');if(r.status!=='pending')throw err('Payout request has already been processed.','ALREADY_PROCESSED');await c.query('SELECT id FROM lead_partners WHERE id=$1 FOR UPDATE',[r.partner_id]);if(a==='reject'){const rejection=String(rejectionReason||'').trim();if(!rejection)throw err('Rejection reason is required.','REJECTION_REASON_REQUIRED');const u=(await c.query(`UPDATE lead_partner_payout_requests SET status='rejected',rejection_reason=$1,notes=COALESCE($2,notes),processed_at=CURRENT_TIMESTAMP,processed_by=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *`,[String(rejectionReason||'').trim()||null,String(notes||'').trim()||null,Number(adminId),Number(requestId)])).rows[0];await c.query(`UPDATE lead_partner_payout_items SET status='released',updated_at=CURRENT_TIMESTAMP WHERE payout_id=$1 AND status='reserved'`,[r.id]);await c.query('COMMIT');return{...u,id:Number(u.id),amount:money(u.amount)}}const ref=String(transferReference||'').trim();if(!ref)throw err('Transfer reference / UTR is required.','TRANSFER_REFERENCE_REQUIRED');const p=proof(proofUrl);if((await c.query(`SELECT id FROM lead_partner_payout_requests WHERE transfer_reference=$1 AND id<>$2`,[ref,r.id])).rows[0])throw err('This transfer reference has already been used.','DUPLICATE_REFERENCE');const allocated=money((await c.query(`SELECT COALESCE(SUM(amount),0) total FROM lead_partner_payout_items WHERE payout_id=$1 AND status='reserved'`,[r.id])).rows[0].total);if(allocated!==money(r.amount))throw err('Payout allocation does not match the requested amount.','PAYOUT_ALLOCATION_MISMATCH');const u=(await c.query(`UPDATE lead_partner_payout_requests SET status='paid',transfer_reference=$1,proof_url=$2,notes=COALESCE($3,notes),processed_at=CURRENT_TIMESTAMP,processed_by=$4,paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *`,[ref,p,String(notes||'').trim()||null,Number(adminId),r.id])).rows[0];await c.query(`UPDATE lead_partner_payout_items SET status='paid',updated_at=CURRENT_TIMESTAMP WHERE payout_id=$1 AND status='reserved'`,[r.id]);await c.query(`UPDATE lead_partner_earnings e SET status=CASE WHEN COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i WHERE i.earning_id=e.id AND i.status='paid'),0)+COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.earning_id=e.id),0)>=e.earning_amount THEN 'paid' ELSE 'available' END,updated_at=CURRENT_TIMESTAMP WHERE e.id IN (SELECT earning_id FROM lead_partner_payout_items WHERE payout_id=$1)`,[r.id]);await c.query('COMMIT');return{...u,id:Number(u.id),amount:money(u.amount)}}catch(e){await c.query('ROLLBACK');if(e?.code==='23505' && e?.constraint==='uq_lp_payout_transfer_reference')throw err('This transfer reference has already been used.','DUPLICATE_REFERENCE');throw e}finally{c.release()}}
async function getTransactions(userId){
  const b=await balance(userId);
  const earningRows=(await pool.query(
    `SELECT e.id,e.earning_amount,e.status,e.created_at,e.updated_at,e.reversal_reason,
            l.id AS lead_id,l.customer_name,
            COALESCE((SELECT SUM(a.amount)
                      FROM lead_partner_earning_adjustment_allocations a
                      WHERE a.earning_id=e.id),0) AS recovery_allocated
     FROM lead_partner_earnings e
     LEFT JOIN leads l ON l.id=e.lead_id
     WHERE e.partner_id=$1
     ORDER BY e.created_at ASC,e.id ASC
     LIMIT 500`,[b.partner.id]
  )).rows;

  const earnings=[];
  for(const r of earningRows){
    const gross=money(r.earning_amount);
    const recoveryAllocated=money(r.recovery_allocated);
    earnings.push({
      id:`E-${Number(r.id)}`,
      type:'earning',
      amount:gross,
      direction:'credit',
      impact:money(Math.max(0,gross-recoveryAllocated)),
      recovery_allocated:recoveryAllocated,
      status:r.status,
      description:r.customer_name?`Lead earning · ${r.customer_name}`:'Partner earning',
      lead_id:r.lead_id?Number(r.lead_id):null,
      created_at:r.created_at,
      processed_at:r.updated_at
    });

    // A sold lead that is later verified fake/invalidated remains visible as
    // the original earning plus a separate reversal deduction. This keeps the
    // transaction history transparent and allows the signed balance to go negative.
    if(String(r.status).toLowerCase()==='reversed'){
      earnings.push({
        id:`R-${Number(r.id)}`,
        type:'reversal',
        amount:gross,
        direction:'debit',
        impact:money(-gross),
        status:'reversed',
        description:r.customer_name?`Lead invalidated / earning refunded · ${r.customer_name}`:'Lead earning reversed / refunded',
        lead_id:r.lead_id?Number(r.lead_id):null,
        reason:r.reversal_reason || 'Verified fake lead',
        created_at:r.updated_at || r.created_at,
        processed_at:r.updated_at
      });
    }
  }

  const payouts=(await pool.query(
    `SELECT id,amount,status,transfer_reference,rejection_reason,requested_at,processed_at,payout_method
     FROM lead_partner_payout_requests
     WHERE partner_id=$1
     ORDER BY requested_at ASC,id ASC
     LIMIT 500`,[b.partner.id]
  )).rows.map(r=>{
    const isDebit=['pending','paid'].includes(String(r.status||'').toLowerCase());
    return {
      id:`W-${Number(r.id)}`,
      type:'withdrawal',
      amount:money(r.amount),
      direction:isDebit?'debit':'neutral',
      impact:isDebit?money(Number(r.amount)*-1):0,
      status:r.status,
      description:r.status==='paid'?'Withdrawal paid':r.status==='rejected'?'Withdrawal rejected':'Withdrawal requested',
      payout_method:r.payout_method,
      transfer_reference:r.transfer_reference,
      rejection_reason:r.rejection_reason,
      created_at:r.requested_at,
      processed_at:r.processed_at
    };
  });

  const chronological=[...earnings,...payouts].sort((a,z)=>{
    const diff=new Date(a.created_at)-new Date(z.created_at);
    return diff || String(a.id).localeCompare(String(z.id));
  });

  let running=0;
  for(const tx of chronological){
    running=money(running+Number(tx.impact||0));
    tx.balance_after=running;
  }

  return {
    available:b.available,
    reserved:b.reserved,
    paid:b.paid,
    total_earned:b.totalEarned,
    recovery_outstanding:b.recoveryOutstanding,
    transaction_net:money(running),
    total_additions:money(earnings.filter(x=>x.direction==='credit').reduce((sum,x)=>sum+Number(x.amount||0),0)),
    total_deductions:money(earnings.filter(x=>x.direction==='debit').reduce((sum,x)=>sum+Number(x.amount||0),0)+payouts.filter(x=>x.direction==='debit').reduce((sum,x)=>sum+Number(x.amount||0),0)),
    transactions:[...chronological].reverse()
  };
}
module.exports={getFunds,getTransactions,requestWithdrawal,adminList,adminProcess};
