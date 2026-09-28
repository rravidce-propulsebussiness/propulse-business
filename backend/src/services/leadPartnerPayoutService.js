const criticalActionAudit=require('./criticalActionAuditService');
const notificationService=require('./notificationService');
const pool=require('../config/database');const payoutAccounts=require('./leadPartnerPayoutAccountService');const privateProofStorage=require('./privateProofStorageService');
const money=v=>Number(Number(v||0).toFixed(2));
const MAX_PROOF_BYTES=6*1024*1024;
const err=(m,c)=>Object.assign(new Error(m),{code:c});
function amount(v){const n=money(v);if(!Number.isFinite(n)||n<=0)throw err('Withdrawal amount must be greater than zero.','INVALID_AMOUNT');return n}
function proof(v){const x=String(v||'').trim();if(!x)throw err('Transfer proof is required.','TRANSFER_PROOF_REQUIRED');const m=x.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i);if(!m)throw err('Transfer proof must be a PNG, JPG, or WebP image.','INVALID_TRANSFER_PROOF');const payload=m[2].replace(/\s/g,'');const bytes=Math.floor(payload.length*3/4)-(payload.endsWith('==')?2:payload.endsWith('=')?1:0);if(bytes<=0||bytes>MAX_PROOF_BYTES)throw err('Transfer proof is too large.','TRANSFER_PROOF_TOO_LARGE');const data=Buffer.from(payload,'base64');const mime=m[1].toLowerCase();const valid=mime==='png'?data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='jpeg'||mime==='jpg'?data.subarray(0,3).equals(Buffer.from([255,216,255])):data.subarray(0,4).toString('ascii')==='RIFF'&&data.subarray(8,12).toString('ascii')==='WEBP';if(!valid)throw err('Transfer proof content does not match its declared file type.','INVALID_TRANSFER_PROOF');return x}
async function partner(userId,client=pool){const r=(await client.query(`SELECT lp.id,lp.user_id,lp.status,u.name,u.email FROM lead_partners lp JOIN users u ON u.id=lp.user_id WHERE lp.user_id=$1`,[Number(userId)])).rows[0];if(!r)throw err('Lead Partner profile not found.','PARTNER_NOT_FOUND');if(r.status!=='active')throw err('Lead Partner account is not active.','PARTNER_NOT_ACTIVE');return r}
async function balance(userId,client=pool,lock=false){const p=await partner(userId,client);const rows=(await client.query(`SELECT e.id,e.status,e.earning_amount,COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.earning_id=e.id),0) adjusted,COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='reserved' AND r.status='pending'),0) reserved,COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='paid' AND r.status='paid'),0) paid FROM lead_partner_earnings e WHERE e.partner_id=$1 AND e.status IN ('available','paid') ORDER BY e.created_at,e.id${lock?' FOR UPDATE':''}`,[p.id])).rows;const recovery=(await client.query(`SELECT COALESCE(SUM(amount),0) total,COALESCE(SUM(CASE WHEN status='outstanding' THEN amount-COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.adjustment_id=lead_partner_earning_adjustments.id),0) ELSE 0 END),0) outstanding FROM lead_partner_earning_adjustments WHERE partner_id=$1`,[p.id])).rows[0]||{};return{partner:p,available:money(rows.reduce((s,r)=>s+(r.status==='available'?Math.max(0,Number(r.earning_amount)-Number(r.adjusted)-Number(r.reserved)-Number(r.paid)):0),0)),reserved:money(rows.reduce((s,r)=>s+Number(r.reserved||0),0)),paid:money(rows.reduce((s,r)=>s+Number(r.paid||0),0)),totalEarned:money(rows.reduce((s,r)=>s+Number(r.earning_amount||0),0)),recoveryOutstanding:money(recovery.outstanding),recoveryTotal:money(recovery.total)}}
async function getFunds(userId){const b=await balance(userId);const account=await payoutAccounts.get(userId);const requests=(await pool.query(`SELECT id,amount,status,transfer_reference,notes,rejection_reason,requested_at,processed_at,paid_at,payout_method FROM lead_partner_payout_requests WHERE user_id=$1 ORDER BY requested_at DESC,id DESC LIMIT 200`,[Number(userId)])).rows;return{available:b.available,reserved:b.reserved,paid:b.paid,total_earned:b.totalEarned,recovery_outstanding:b.recoveryOutstanding,recovery_total:b.recoveryTotal,payout_account:account,requests:requests.map(r=>({...r,id:Number(r.id),amount:money(r.amount)}))}}
async function createPayoutRequest({userId,rawAmount,notes,client,source='partner'}){
  const requested=amount(rawAmount);
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`lead-partner-withdrawal:${Number(userId)}`]);
  const p0=(await client.query("SELECT id FROM lead_partners WHERE user_id=$1 AND status='active' FOR UPDATE",[Number(userId)])).rows[0];
  if(!p0)throw err('Lead Partner account is not active.','PARTNER_NOT_ACTIVE');
  const b=await balance(userId,client,true);
  const account=await payoutAccounts.getInternal(client,userId);
  if(!account)throw err('Add a Bank Account or UPI before requesting a withdrawal.','PAYOUT_ACCOUNT_REQUIRED');
  if(requested>b.available+0.001)throw err('Withdrawal amount exceeds available earnings after recovery adjustments.','INSUFFICIENT_FUNDS');
  const snapshot=account.method==='upi'
    ?{method:'upi',upi_id:account.upi_id}
    :{method:'bank',account_holder_name:account.account_holder_name,account_number:account.account_number,ifsc_code:account.ifsc_code,bank_name:account.bank_name};
  const p=(await client.query(
    `INSERT INTO lead_partner_payout_requests(partner_id,user_id,payout_account_id,payout_method,payout_account_snapshot,amount,notes,request_source)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [b.partner.id,Number(userId),account.id,account.method,snapshot,requested,String(notes||'').trim()||null,source==='admin'?'admin':'partner']
  )).rows[0];
  let remaining=requested;
  const earnings=(await client.query(
    `SELECT e.id,e.earning_amount,
            COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.earning_id=e.id),0) adjusted,
            COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='reserved' AND r.status='pending'),0) reserved,
            COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i JOIN lead_partner_payout_requests r ON r.id=i.payout_id WHERE i.earning_id=e.id AND i.status='paid' AND r.status='paid'),0) paid
     FROM lead_partner_earnings e
     WHERE e.partner_id=$1 AND e.status='available'
     ORDER BY e.created_at,e.id FOR UPDATE`,[b.partner.id]
  )).rows;
  for(const e of earnings){
    if(remaining<=.001)break;
    const free=Math.max(0,Number(e.earning_amount)-Number(e.adjusted)-Number(e.reserved)-Number(e.paid));
    const a=money(Math.min(free,remaining));
    if(a<=0)continue;
    await client.query(`INSERT INTO lead_partner_payout_items(payout_id,earning_id,amount,status) VALUES($1,$2,$3,'reserved')`,[p.id,e.id,a]);
    remaining=money(remaining-a);
  }
  if(remaining>.001)throw err('Available earnings changed while creating the withdrawal. Please try again.','INSUFFICIENT_FUNDS');
  return{...p,id:Number(p.id),amount:money(p.amount)};
}

async function requestWithdrawal({userId,amount:raw,notes}){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const payout=await createPayoutRequest({userId,rawAmount:raw,notes,client,source:'partner'});
    await client.query('COMMIT');
    return payout;
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}

async function adminList({status='all',search='',page=1,limit=50}={}){
  const normalizedStatus=String(status||'all').trim().toLowerCase();
  if(!['all','pending','paid','rejected'].includes(normalizedStatus))throw err('Invalid payout status filter.','INVALID_STATUS');
  const searchParams=[],searchWhere=[];
  const searchValue=String(search||'').trim();
  if(searchValue){
    searchParams.push(`%${searchValue}%`);
    searchWhere.push(`(u.name ILIKE $1 OR u.email ILIKE $1 OR CAST(r.id AS TEXT) ILIKE $1 OR COALESCE(r.transfer_reference,'') ILIKE $1)`);
  }
  const safeLimit=Math.min(Math.max(Number(limit)||50,1),100);
  const safePage=Math.max(Number(page)||1,1);
  const baseFrom=`lead_partner_payout_requests r JOIN users u ON u.id=r.user_id JOIN lead_partners lp ON lp.id=r.partner_id`;
  const baseWhere=searchWhere.length?`WHERE ${searchWhere.join(' AND ')}`:'';

  const dataParams=[...searchParams];
  const dataWhere=[...searchWhere];
  if(normalizedStatus!=='all'){
    dataParams.push(normalizedStatus);
    dataWhere.push(`r.status=$${dataParams.length}`);
  }
  const scopedWhere=dataWhere.length?`WHERE ${dataWhere.join(' AND ')}`:'';
  const total=Number((await pool.query(`SELECT COUNT(*)::int total FROM ${baseFrom} ${scopedWhere}`,dataParams)).rows[0]?.total||0);
  const pages=Math.ceil(total/safeLimit);
  const pageValue=pages>0?Math.min(safePage,pages):1;
  const offset=(pageValue-1)*safeLimit;

  const stats=(await pool.query(
    `SELECT COUNT(*)::int total_count,
            COUNT(*) FILTER(WHERE r.status='pending')::int pending_count,
            COUNT(*) FILTER(WHERE r.status='paid')::int paid_count,
            COUNT(*) FILTER(WHERE r.status='rejected')::int rejected_count,
            COUNT(*) FILTER(WHERE COALESCE(r.request_source,'partner')='admin')::int direct_count,
            COALESCE(SUM(r.amount) FILTER(WHERE r.status='pending'),0)::numeric pending_amount,
            COALESCE(SUM(r.amount) FILTER(WHERE r.status='paid'),0)::numeric paid_amount
       FROM ${baseFrom} ${baseWhere}`,searchParams
  )).rows[0]||{};

  const rowParams=[...dataParams,safeLimit,offset];
  const rows=(await pool.query(
    `SELECT r.id,r.partner_id,r.user_id,r.payout_account_id,r.payout_method,r.payout_account_snapshot,
            r.amount,r.status,r.transfer_reference,(COALESCE(BTRIM(r.proof_url),'')<>'') AS has_proof,
            r.notes,r.rejection_reason,r.requested_at,r.processed_at,r.processed_by,r.paid_at,
            r.created_at,r.updated_at,r.request_source,
            u.name user_name,u.email user_email,lp.status partner_status
       FROM ${baseFrom}
       ${scopedWhere}
       ORDER BY CASE WHEN r.status='pending' THEN 0 ELSE 1 END,r.requested_at DESC,r.id DESC
       LIMIT $${rowParams.length-1} OFFSET $${rowParams.length}`,rowParams
  )).rows.map(r=>({...r,id:Number(r.id),partner_id:Number(r.partner_id),user_id:Number(r.user_id),amount:money(r.amount),payout_account_id:r.payout_account_id?Number(r.payout_account_id):null,request_source:r.request_source||'partner'}));

  return{
    items:rows,total,page:pageValue,limit:safeLimit,pages,
    stats:{
      total_count:Number(stats.total_count||0),
      pending_count:Number(stats.pending_count||0),
      paid_count:Number(stats.paid_count||0),
      rejected_count:Number(stats.rejected_count||0),
      direct_count:Number(stats.direct_count||0),
      pending_amount:money(stats.pending_amount),
      paid_amount:money(stats.paid_amount)
    }
  };
}

async function adminProof(requestId){
  const id=Number(requestId);
  if(!Number.isInteger(id)||id<=0)return null;
  const row=(await pool.query(`SELECT id,proof_url FROM lead_partner_payout_requests WHERE id=$1`,[id])).rows[0];
  if(!row)return null;
  return{id:Number(row.id),proof_url:await privateProofStorage.materializeProof(row.proof_url,{maxBytes:MAX_PROOF_BYTES})};
}
async function adminProofDescriptor(requestId){
  const id=Number(requestId);
  if(!Number.isInteger(id)||id<=0)return null;
  const row=(await pool.query(`SELECT id,proof_url FROM lead_partner_payout_requests WHERE id=$1`,[id])).rows[0];
  if(!row)return null;
  return privateProofStorage.getProofDescriptor(row.proof_url,{maxBytes:MAX_PROOF_BYTES});
}

async function markPaid({client,r,adminId,transferReference,proofUrl,notes}){
  const ref=String(transferReference||'').trim();
  if(!ref)throw err('Transfer reference / UTR is required.','TRANSFER_REFERENCE_REQUIRED');
  const validatedProof=proof(proofUrl);
  if((await client.query(`SELECT id FROM lead_partner_payout_requests WHERE transfer_reference=$1 AND id<>$2`,[ref,r.id])).rows[0])throw err('This transfer reference has already been used.','DUPLICATE_REFERENCE');
  const allocated=money((await client.query(`SELECT COALESCE(SUM(amount),0) total FROM lead_partner_payout_items WHERE payout_id=$1 AND status='reserved'`,[r.id])).rows[0].total);
  if(allocated!==money(r.amount))throw err('Payout allocation does not match the requested amount.','PAYOUT_ALLOCATION_MISMATCH');
  const storedProof=await privateProofStorage.storeDataUrl(validatedProof,{category:'lead-partner-payouts',maxBytes:MAX_PROOF_BYTES});
  try{
    const u=(await client.query(
      `UPDATE lead_partner_payout_requests
       SET status='paid',transfer_reference=$1,proof_url=$2,notes=COALESCE($3,notes),processed_at=CURRENT_TIMESTAMP,processed_by=$4,paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
       WHERE id=$5 RETURNING *`,[ref,storedProof,String(notes||'').trim()||null,Number(adminId),r.id]
    )).rows[0];
    await client.query(`UPDATE lead_partner_payout_items SET status='paid',updated_at=CURRENT_TIMESTAMP WHERE payout_id=$1 AND status='reserved'`,[r.id]);
    await client.query(
      `UPDATE lead_partner_earnings e
       SET status=CASE WHEN COALESCE((SELECT SUM(i.amount) FROM lead_partner_payout_items i WHERE i.earning_id=e.id AND i.status='paid'),0)+COALESCE((SELECT SUM(a.amount) FROM lead_partner_earning_adjustment_allocations a WHERE a.earning_id=e.id),0)>=e.earning_amount THEN 'paid' ELSE 'available' END,updated_at=CURRENT_TIMESTAMP
       WHERE e.id IN (SELECT earning_id FROM lead_partner_payout_items WHERE payout_id=$1)`,[r.id]
    );
    return{payout:{...u,id:Number(u.id),amount:money(u.amount)},storedProof};
  }catch(error){
    await privateProofStorage.removeStoredProof(storedProof).catch(cleanupError=>console.error('Lead Partner payout proof cleanup failed:',cleanupError.message));
    throw error;
  }
}

async function adminProcess({requestId,adminId,action,transferReference,proofUrl,rejectionReason,notes}){
  const a=String(action||'').trim().toLowerCase();
  if(!['paid','reject'].includes(a))throw err('Invalid payout action.','INVALID_ACTION');
  const c=await pool.connect();
  let storedProof=null;
  try{
    await c.query('BEGIN');
    const r=(await c.query('SELECT * FROM lead_partner_payout_requests WHERE id=$1 FOR UPDATE',[Number(requestId)])).rows[0];
    if(!r)throw err('Payout request not found.','NOT_FOUND');
    if(r.status!=='pending')throw err('Payout request has already been processed.','ALREADY_PROCESSED');
    await c.query('SELECT id FROM lead_partners WHERE id=$1 FOR UPDATE',[r.partner_id]);
    if(a==='reject'){
      const rejection=String(rejectionReason||'').trim();
      if(!rejection)throw err('Rejection reason is required.','REJECTION_REASON_REQUIRED');
      const u=(await c.query(
        `UPDATE lead_partner_payout_requests SET status='rejected',rejection_reason=$1,notes=COALESCE($2,notes),processed_at=CURRENT_TIMESTAMP,processed_by=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *`,
        [rejection,String(notes||'').trim()||null,Number(adminId),Number(requestId)]
      )).rows[0];
      await c.query(`UPDATE lead_partner_payout_items SET status='released',updated_at=CURRENT_TIMESTAMP WHERE payout_id=$1 AND status='reserved'`,[r.id]);
      await criticalActionAudit.record(c,{actorId:adminId,category:'payout',action:'payout.lead_partner_process',entityType:'lead_partner_payout',entityId:r.id,beforeData:{status:r.status,amount:money(r.amount),partnerId:r.partner_id},afterData:{status:u.status,amount:money(u.amount),partnerId:u.partner_id},reason:rejection,metadata:{action:'reject'},source:'lead_partner_payout_service'});
      await notificationService.notifyUser({userId:r.user_id,type:'payout_rejected',category:'payout',severity:'warning',title:'Withdrawal not approved',message:`Your withdrawal request of ₹${money(r.amount).toLocaleString('en-IN')} was not approved. Reason: ${rejection}`,actionUrl:'/lead-partner/withdrawals',relatedType:'lead_partner_payout',relatedId:r.id,dedupeKey:`lead-partner-payout:${r.id}:rejected`,metadata:{amount:money(r.amount),status:'rejected'}},c);
      await c.query('COMMIT');
      return{...u,id:Number(u.id),amount:money(u.amount)};
    }
    const paid=await markPaid({client:c,r,adminId,transferReference,proofUrl,notes});
    storedProof=paid.storedProof;
    await criticalActionAudit.record(c,{actorId:adminId,category:'payout',action:'payout.lead_partner_process',entityType:'lead_partner_payout',entityId:r.id,beforeData:{status:r.status,amount:money(r.amount),partnerId:r.partner_id},afterData:{status:paid.payout.status,amount:paid.payout.amount,partnerId:r.partner_id},reason:notes,metadata:{action:'paid'},source:'lead_partner_payout_service'});
    await notificationService.notifyUser({userId:r.user_id,type:'payout_paid',category:'payout',severity:'success',title:'Withdrawal paid',message:`Your withdrawal of ₹${money(r.amount).toLocaleString('en-IN')} has been processed.`,actionUrl:'/lead-partner/withdrawals',relatedType:'lead_partner_payout',relatedId:r.id,dedupeKey:`lead-partner-payout:${r.id}:paid`,metadata:{amount:money(r.amount),status:'paid'}},c);
    await c.query('COMMIT');
    return paid.payout;
  }catch(e){
    await c.query('ROLLBACK');
    if(storedProof)await privateProofStorage.removeStoredProof(storedProof).catch(cleanupError=>console.error('Lead Partner payout proof cleanup failed:',cleanupError.message));
    if(e?.code==='23505' && e?.constraint==='uq_lp_payout_transfer_reference')throw err('This transfer reference has already been used.','DUPLICATE_REFERENCE');
    throw e;
  }finally{c.release()}
}

async function adminDirectPayout({partnerId,userId,adminId,amount:raw,transferReference,proofUrl,notes}){
  const c=await pool.connect();
  let storedProof=null;
  try{
    await c.query('BEGIN');
    let targetUserId=Number(userId)||0;
    if(partnerId){
      const row=(await c.query('SELECT user_id,status FROM lead_partners WHERE id=$1 FOR UPDATE',[Number(partnerId)])).rows[0];
      if(!row)throw err('Lead Partner profile not found.','PARTNER_NOT_FOUND');
      if(row.status!=='active')throw err('Lead Partner account is not active.','PARTNER_NOT_ACTIVE');
      targetUserId=Number(row.user_id);
    }
    if(!targetUserId)throw err('Select a Lead Partner.','PARTNER_NOT_FOUND');
    const payout=await createPayoutRequest({userId:targetUserId,rawAmount:raw,notes,client:c,source:'admin'});
    const r=(await c.query('SELECT * FROM lead_partner_payout_requests WHERE id=$1 FOR UPDATE',[payout.id])).rows[0];
    const paid=await markPaid({client:c,r,adminId,transferReference,proofUrl,notes});
    storedProof=paid.storedProof;
    await criticalActionAudit.record(c,{actorId:adminId,category:'payout',action:'payout.lead_partner_direct',entityType:'lead_partner_payout',entityId:r.id,beforeData:null,afterData:{status:paid.payout.status,amount:paid.payout.amount,partnerId:r.partner_id,userId:targetUserId},reason:notes,source:'lead_partner_payout_service'});
    await notificationService.notifyUser({userId:targetUserId,type:'payout_paid',category:'payout',severity:'success',title:'Partner payout sent',message:`ProPulse processed a payout of ₹${money(r.amount).toLocaleString('en-IN')} to your payout account.`,actionUrl:'/lead-partner/withdrawals',relatedType:'lead_partner_payout',relatedId:r.id,dedupeKey:`lead-partner-payout:${r.id}:paid`,metadata:{amount:money(r.amount),status:'paid'}},c);
    await c.query('COMMIT');
    return paid.payout;
  }catch(e){
    await c.query('ROLLBACK');
    if(storedProof)await privateProofStorage.removeStoredProof(storedProof).catch(cleanupError=>console.error('Lead Partner payout proof cleanup failed:',cleanupError.message));
    if(e?.code==='23505' && e?.constraint==='uq_lp_payout_transfer_reference')throw err('This transfer reference has already been used.','DUPLICATE_REFERENCE');
    throw e;
  }finally{c.release()}
}

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
module.exports={getFunds,getTransactions,requestWithdrawal,adminList,adminProof,adminProofDescriptor,adminProcess,adminDirectPayout};
