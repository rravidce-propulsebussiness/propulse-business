const criticalActionAudit=require('./criticalActionAuditService');
const notificationService=require('./notificationService');
const pool = require('../config/database');
const privateProofStorage = require('./privateProofStorageService');
const payoutAccounts = require('./investorPayoutAccountService');
const ledger = require('./investorFinancialLedgerService');
const cycleService = require('./investmentCycleService');
const MAX_PROOF_DATA_URL_LENGTH=8*1024*1024;
async function getBalance(userId,client=pool){const summary=await ledger.getInvestorFinancialSummary(userId,client);return{generated:summary.auto_invest_earnings+summary.non_auto_earnings,settled_investment_earnings:summary.settled_non_auto_earnings,transferred:summary.payout_transferred,reserved:summary.payout_reserved,available:summary.transferable};}
async function getTransferableBalance(userId,client=pool){return ledger.getInvestorFinancialSummary(userId,client).then(summary=>summary.transferable);}
function sanitizeInvestorRequest(row){return{id:Number(row.id),amount:Number(row.amount||0),status:row.status,transfer_reference:row.transfer_reference||null,notes:row.notes||null,requested_at:row.requested_at,processed_at:row.processed_at,payout_method:row.payout_method||null,cycle_id:row.cycle_id?Number(row.cycle_id):null,withdrawal_type:row.withdrawal_type||'PARTIAL'};}
async function getInvestorFunds(userId,cycleId=null){
  const scoped=cycleId!=null;
  const cycleValue=scoped?Number(cycleId):null;
  const values=scoped?[Number(userId),cycleValue]:[Number(userId)];
  const scopeSql=scoped?' AND cycle_id=$2':'';
  const requestLimit=100;
  const summaryPromise=ledger.getInvestorFinancialSummary(userId,pool,cycleValue);
  const investmentsPromise=pool.query(`SELECT COALESCE(SUM(amount) FILTER (WHERE status <> 'cancelled' AND parent_investment_id IS NULL),0) AS total_invested FROM investments WHERE user_id=$1 AND status <> 'cancelled'${scopeSql}`,values);
  const requestsPromise=pool.query(`SELECT id,amount,status,transfer_reference,notes,requested_at,processed_at,payout_method,cycle_id,withdrawal_type FROM investor_payout_requests WHERE user_id=$1${scopeSql} ORDER BY requested_at DESC,id DESC LIMIT ${requestLimit}`,values);
  const requestCountPromise=pool.query(`SELECT COUNT(*)::int AS total FROM investor_payout_requests WHERE user_id=$1${scopeSql}`,values);
  const [summary,account,requests,requestCount,investments]=await Promise.all([summaryPromise,payoutAccounts.get(userId),requestsPromise,requestCountPromise,investmentsPromise]);
  const totalInvested=Number(investments.rows[0]?.total_invested||0);
  const requestsTotal=Number(requestCount.rows[0]?.total||0);
  return{generated:Number((summary.auto_invest_earnings+summary.non_auto_earnings).toFixed(2)),transferable:Number(summary.transferable.toFixed(2)),withdrawable_earnings:Number(summary.withdrawable_earnings.toFixed(2)),payout_account:account,total_invested:Number(totalInvested.toFixed(2)),available_for_ads:Number(summary.available_for_ads.toFixed(2)),total_ad_spent:Number(summary.ad_spent.toFixed(2)),auto_invest_earnings:Number(summary.auto_invest_earnings.toFixed(2)),auto_invest_earnings_consumed:Number(summary.auto_invest_earnings_consumed.toFixed(2)),auto_invest_earnings_withdrawable:Number(summary.auto_invest_earnings_withdrawable.toFixed(2)),non_auto_earnings:Number(summary.non_auto_earnings.toFixed(2)),non_auto_earnings_withdrawable:Number(summary.non_auto_earnings_withdrawable.toFixed(2)),ad_spent:Number(summary.ad_spent.toFixed(2)),payout_reserved:Number(summary.payout_reserved.toFixed(2)),payout_transferred:Number(summary.payout_transferred.toFixed(2)),unallocated_investment_capital:Number(Math.max(0,summary.capital-summary.ad_spent).toFixed(2)),reserved:Number(summary.payout_reserved.toFixed(2)),requests:requests.rows.map(sanitizeInvestorRequest),requests_total:requestsTotal,requests_limit:requestLimit};
}
async function requestTransfer({userId,amount,notes,withdrawalType='PARTIAL'}){const requestedAmount=Number(amount);if(!Number.isFinite(requestedAmount)||requestedAmount<=0)throw Object.assign(new Error('Withdrawal amount must be greater than zero.'),{code:'INVALID_AMOUNT'});const client=await pool.connect();try{await client.query('BEGIN');await ledger.lockInvestorFinancials(client,userId);const account=await payoutAccounts.getInternal(client,userId);if(!account)throw Object.assign(new Error('Add a Bank Account or UPI before requesting a withdrawal.'),{code:'PAYOUT_ACCOUNT_REQUIRED'});const cycle=await cycleService.getActiveCycle(client,userId,{forUpdate:true});if(!cycle)throw Object.assign(new Error('No active investment cycle is available for withdrawal.'),{code:'CYCLE_NOT_FOUND'});const normalizedType=String(withdrawalType||'PARTIAL').toUpperCase();if(!['PARTIAL','FINAL_EXIT'].includes(normalizedType))throw Object.assign(new Error('Invalid withdrawal type.'),{code:'INVALID_WITHDRAWAL_TYPE'});if(normalizedType==='FINAL_EXIT'&&String(cycle.status).toUpperCase()==='ACTIVE'){await client.query(`UPDATE investment_cycles SET status='EXIT_REQUESTED',exit_requested_at=COALESCE(exit_requested_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[cycle.id]);}
const available=await getTransferableBalance(userId,client);if(requestedAmount>available+1e-6)throw Object.assign(new Error('Withdrawal amount exceeds your available earnings.'),{code:'INSUFFICIENT_GENERATED_FUNDS'});const snapshot=account.method==='upi'?{method:'upi',upi_id:account.upi_id}:{method:'bank',account_holder_name:account.account_holder_name,account_number:account.account_number,ifsc_code:account.ifsc_code,bank_name:account.bank_name};const result=await client.query(`INSERT INTO investor_payout_requests(user_id,amount,notes,payout_account_id,payout_method,payout_account_snapshot,cycle_id,withdrawal_type) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[Number(userId),requestedAmount,String(notes||'').trim()||null,account.id,account.method,snapshot,Number(cycle.id),normalizedType]);await client.query('COMMIT');return{...result.rows[0],amount:Number(result.rows[0].amount),cycle_id:Number(cycle.id),withdrawal_type:normalizedType};}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}
async function adminList({status='all',search='',page=1,limit=50}={}){
  const normalizedStatus=String(status||'all').trim().toLowerCase();
  if(!['all','pending','paid','rejected','cancelled'].includes(normalizedStatus))throw Object.assign(new Error('Invalid withdrawal status filter'),{code:'INVALID_STATUS'});
  const searchValues=[],searchWhere=[];
  const query=String(search||'').trim();
  if(query){
    searchValues.push(`%${query}%`);
    searchWhere.push(`(u.name ILIKE $${searchValues.length} OR u.email ILIKE $${searchValues.length} OR COALESCE(r.transfer_reference,'') ILIKE $${searchValues.length})`);
  }
  const safeLimit=Math.min(Math.max(Number(limit)||50,1),100);
  const safePage=Math.max(Number(page)||1,1);
  const offset=(safePage-1)*safeLimit;
  const dataValues=[...searchValues],dataWhere=[...searchWhere];
  if(normalizedStatus!=='all'){
    dataValues.push(normalizedStatus);
    dataWhere.push(`r.status=$${dataValues.length}`);
  }
  const dataFrom='investor_payout_requests r JOIN users u ON u.id=r.user_id';
  const dataWhereSql=dataWhere.length?`WHERE ${dataWhere.join(' AND ')}`:'';
  const searchWhereSql=searchWhere.length?`WHERE ${searchWhere.join(' AND ')}`:'';
  const rowValues=[...dataValues,safeLimit,offset];
  const [countResult,statsResult,rowsResult]=await Promise.all([
    pool.query(`SELECT COUNT(*)::int total FROM ${dataFrom} ${dataWhereSql}`,dataValues),
    pool.query(`SELECT COUNT(*)::int total_count,
      COALESCE(SUM(r.amount),0)::numeric total_amount,
      COUNT(*) FILTER(WHERE r.status='pending')::int pending_count,
      COALESCE(SUM(r.amount) FILTER(WHERE r.status='pending'),0)::numeric pending_amount,
      COUNT(*) FILTER(WHERE r.status='paid')::int paid_count,
      COALESCE(SUM(r.amount) FILTER(WHERE r.status='paid'),0)::numeric paid_amount,
      COUNT(*) FILTER(WHERE r.status='rejected')::int rejected_count,
      COALESCE(SUM(r.amount) FILTER(WHERE r.status='rejected'),0)::numeric rejected_amount
      FROM ${dataFrom} ${searchWhereSql}`,searchValues),
    pool.query(`SELECT r.id,r.user_id,r.amount,r.status,r.transfer_reference,r.notes,r.requested_at,r.processed_at,r.processed_by,r.payout_method,r.payout_account_snapshot,r.cycle_id,r.withdrawal_type,(COALESCE(BTRIM(r.proof_url),'')<>'') AS has_proof,u.name AS user_name,u.email AS user_email
      FROM ${dataFrom} ${dataWhereSql}
      ORDER BY r.requested_at DESC,r.id DESC
      LIMIT $${rowValues.length-1} OFFSET $${rowValues.length}`,rowValues)
  ]);
  const total=Number(countResult.rows[0]?.total||0);
  const stats=statsResult.rows[0]||{};
  return{
    items:rowsResult.rows.map(row=>({...row,amount:Number(row.amount||0),cycle_id:row.cycle_id?Number(row.cycle_id):null,withdrawal_type:row.withdrawal_type||'PARTIAL'})),
    total,page:safePage,limit:safeLimit,pages:Math.max(1,Math.ceil(total/safeLimit)),
    stats:{
      totalCount:Number(stats.total_count||0),totalAmount:Number(stats.total_amount||0),
      pendingCount:Number(stats.pending_count||0),pendingAmount:Number(stats.pending_amount||0),
      paidCount:Number(stats.paid_count||0),paidAmount:Number(stats.paid_amount||0),
      rejectedCount:Number(stats.rejected_count||0),rejectedAmount:Number(stats.rejected_amount||0)
    }
  };
}
async function getAdminProof(requestId){const row=(await pool.query(`SELECT id,status,proof_url,transfer_reference,processed_at FROM investor_payout_requests WHERE id=$1`,[Number(requestId)])).rows[0];if(!row)throw Object.assign(new Error('Transfer request not found'),{code:'NOT_FOUND'});return{id:Number(row.id),status:row.status,proof_url:await privateProofStorage.materializeProof(row.proof_url,{maxBytes:6*1024*1024}),transfer_reference:row.transfer_reference||null,processed_at:row.processed_at};}
async function getAdminProofDescriptor(requestId){const row=(await pool.query(`SELECT id,proof_url FROM investor_payout_requests WHERE id=$1`,[Number(requestId)])).rows[0];if(!row)throw Object.assign(new Error('Transfer request not found'),{code:'NOT_FOUND'});return privateProofStorage.getProofDescriptor(row.proof_url,{maxBytes:6*1024*1024});}
function validateProof(proofUrl){const value=String(proofUrl||'').trim();if(!value)throw Object.assign(new Error('Transfer proof is required'),{code:'TRANSFER_PROOF_REQUIRED'});if(value.length>MAX_PROOF_DATA_URL_LENGTH)throw Object.assign(new Error('Transfer proof image is too large. Please use an image under 6 MB.'),{code:'TRANSFER_PROOF_TOO_LARGE'});if(value.startsWith('data:')){const match=value.match(/^data:(image\/(png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i);if(!match)throw Object.assign(new Error('Transfer proof must be a PNG, JPG, or WebP screenshot.'),{code:'INVALID_TRANSFER_PROOF'});const data=Buffer.from(match[3],'base64');const mime=match[2].toLowerCase();const valid=mime==='png'?data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='jpeg'||mime==='jpg'?data.subarray(0,3).equals(Buffer.from([255,216,255])):data.subarray(0,4).toString('ascii')==='RIFF'&&data.subarray(8,12).toString('ascii')==='WEBP';if(!valid)throw Object.assign(new Error('Transfer proof content does not match its declared file type.'),{code:'INVALID_TRANSFER_PROOF'});}else if(!/^https?:\/\//i.test(value))throw Object.assign(new Error('Transfer proof must be an image screenshot or a valid proof URL.'),{code:'INVALID_TRANSFER_PROOF'});return value;}
async function adminProcess({requestId,adminId,action,transferReference,proofUrl,notes}){
  const normalizedAction=String(action||'').trim().toLowerCase();
  if(!['paid','reject'].includes(normalizedAction))throw Object.assign(new Error('Invalid withdrawal action.'),{code:'INVALID_ACTION'});
  const client=await pool.connect();
  let storedProof=null;
  try{
    await client.query('BEGIN');
    const row=(await client.query('SELECT * FROM investor_payout_requests WHERE id=$1 FOR UPDATE',[Number(requestId)])).rows[0];
    if(!row)throw Object.assign(new Error('Transfer request not found'),{code:'NOT_FOUND'});
    if(row.status!=='pending')throw Object.assign(new Error('Transfer request has already been processed'),{code:'ALREADY_PROCESSED'});
    await ledger.lockInvestorFinancials(client,row.user_id);
    if(normalizedAction==='reject'){
      const updated=(await client.query(`UPDATE investor_payout_requests SET status='rejected',notes=COALESCE($1,notes),processed_at=CURRENT_TIMESTAMP,processed_by=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *`,[String(notes||'').trim()||null,Number(adminId),Number(requestId)])).rows[0];
      await criticalActionAudit.record(client,{actorId:adminId,category:'payout',action:'payout.investor_process',entityType:'investor_payout',entityId:row.id,beforeData:{status:row.status,amount:Number(row.amount),userId:row.user_id},afterData:{status:updated.status,amount:Number(updated.amount),userId:updated.user_id},reason:notes,metadata:{action:'reject'},source:'investor_payout_service'});
      await notificationService.notifyUser({userId:row.user_id,type:'investor_payout_rejected',category:'payout',severity:'warning',title:'Investor withdrawal not approved',message:`Your investor withdrawal request of ₹${Number(row.amount).toLocaleString('en-IN')} was not approved.`,actionUrl:'/investment/payouts',relatedType:'investor_payout',relatedId:row.id,dedupeKey:`investor-payout:${row.id}:rejected`,metadata:{amount:Number(row.amount),status:'rejected'}},client);
      await client.query('COMMIT');
      return{...updated,amount:Number(updated.amount)};
    }
    const reference=String(transferReference||'').trim();
    if(!reference)throw Object.assign(new Error('Transfer reference / UTR is required'),{code:'TRANSFER_REFERENCE_REQUIRED'});
    const validatedProof=validateProof(proofUrl);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`investor-payout-reference:${reference.toLowerCase()}`]);
    const duplicate=(await client.query(`SELECT id FROM investor_payout_requests WHERE LOWER(BTRIM(transfer_reference))=LOWER(BTRIM($1)) AND id<>$2 UNION ALL SELECT id FROM investments WHERE LOWER(BTRIM(payout_transfer_reference))=LOWER(BTRIM($1)) LIMIT 1`,[reference,Number(requestId)])).rows[0];
    if(duplicate)throw Object.assign(new Error('This transfer reference has already been used'),{code:'DUPLICATE_REFERENCE'});
    const summary=await ledger.getInvestorFinancialSummary(row.user_id,client);
    const earningsAvailableBeforePending=Math.max(0,summary.transferable+summary.payout_reserved);
    if(Number(row.amount)>earningsAvailableBeforePending+1e-6)throw Object.assign(new Error('Withdrawal amount is no longer available.'),{code:'INSUFFICIENT_GENERATED_FUNDS'});
    storedProof=await privateProofStorage.storeDataUrl(validatedProof,{category:'investor-payouts',maxBytes:6*1024*1024});
    const updated=(await client.query(`UPDATE investor_payout_requests SET status='paid',transfer_reference=$1,proof_url=$2,notes=COALESCE($3,notes),processed_at=CURRENT_TIMESTAMP,processed_by=$4,updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *`,[reference,storedProof,String(notes||'').trim()||null,Number(adminId),Number(requestId)])).rows[0];
    await criticalActionAudit.record(client,{actorId:adminId,category:'payout',action:'payout.investor_process',entityType:'investor_payout',entityId:row.id,beforeData:{status:row.status,amount:Number(row.amount),userId:row.user_id},afterData:{status:updated.status,amount:Number(updated.amount),userId:updated.user_id},reason:notes,metadata:{action:'paid'},source:'investor_payout_service'});
    await notificationService.notifyUser({userId:row.user_id,type:'investor_payout_paid',category:'payout',severity:'success',title:'Investor withdrawal paid',message:`Your investor withdrawal of ₹${Number(row.amount).toLocaleString('en-IN')} has been processed.`,actionUrl:'/investment/payouts',relatedType:'investor_payout',relatedId:row.id,dedupeKey:`investor-payout:${row.id}:paid`,metadata:{amount:Number(row.amount),status:'paid'}},client);
    await client.query('COMMIT');
    return{...updated,amount:Number(updated.amount)};
  }catch(error){
    await client.query('ROLLBACK');
    if(storedProof)await privateProofStorage.removeStoredProof(storedProof).catch(cleanupError=>console.error('Investor payout proof cleanup failed:',cleanupError.message));
    throw error;
  }finally{client.release()}
}

module.exports={getInvestorFunds,requestTransfer,adminList,getAdminProof,getAdminProofDescriptor,adminProcess};