const pool=require('../config/database');
const couponService=require('./couponService');
const leadPartnerEarningsService=require('./leadPartnerEarningsService');
const REPORT_REASONS=['fake','wrong_number','not_interested','duplicate','other'];
const REVIEW_STATUSES=['verified_fake','verified_genuine','rejected'];
async function getReportingControl(userId){const result=await pool.query('SELECT can_report_leads,false_report_count,restriction_reason FROM lead_reporting_controls WHERE user_id=$1',[userId]);return result.rows[0]||{can_report_leads:true,false_report_count:0,restriction_reason:null}}
async function hasLeadAccess(userId,leadId){const result=await pool.query("SELECT 1 FROM lead_purchases WHERE user_id=$1 AND lead_id=$2 AND status='paid' UNION ALL SELECT 1 FROM lead_entitlement_claims WHERE user_id=$1 AND lead_id=$2 AND (expires_at IS NULL OR expires_at>=CURRENT_TIMESTAMP) LIMIT 1",[userId,leadId]);return result.rows.length>0}
async function createReport({leadId,reporterUserId,reason,details}){const id=Number(leadId);if(!Number.isInteger(id)||id<=0)throw new Error('Invalid lead ID');if(!REPORT_REASONS.includes(reason)){const e=new Error('Invalid report reason');e.code='INVALID_REPORT_REASON';throw e}const control=await getReportingControl(reporterUserId);if(!control.can_report_leads){const e=new Error(control.restriction_reason||'Lead reporting is currently disabled for your account');e.code='REPORTING_DISABLED';throw e}if(!(await hasLeadAccess(reporterUserId,id))){const e=new Error('You can report a lead only after you have access to it');e.code='REPORT_NOT_ELIGIBLE';throw e}const lead=(await pool.query('SELECT id,status FROM leads WHERE id=$1',[id])).rows[0];if(!lead){const e=new Error('Lead not found');e.code='LEAD_NOT_FOUND';throw e}if(lead.status==='invalid'){const e=new Error('This lead has already been marked invalid');e.code='LEAD_ALREADY_INVALID';throw e}const existing=(await pool.query('SELECT id,status FROM lead_reports WHERE lead_id=$1 AND reporter_user_id=$2 ORDER BY id DESC LIMIT 1',[id,reporterUserId])).rows[0];if(existing?.status==='pending'){const e=new Error('You already have a pending report for this lead');e.code='REPORT_ALREADY_PENDING';throw e}return(await pool.query('INSERT INTO lead_reports(lead_id,reporter_user_id,reason,details) VALUES($1,$2,$3,$4) RETURNING *',[id,reporterUserId,reason,String(details||'').trim()||null])).rows[0]}
async function getMyReports(userId){
  const result=await pool.query(
    `SELECT r.*,
            l.customer_name,l.customer_phone,l.customer_email,
            l.industry_id,l.service_id,l.city_id,l.status AS lead_status,
            i.name AS industry_name,
            s.name AS service_name,
            c.name AS city_name,
            st.name AS state_name
     FROM lead_reports r
     JOIN leads l ON l.id=r.lead_id
     LEFT JOIN industries i ON i.id=l.industry_id
     LEFT JOIN services s ON s.id=l.service_id
     LEFT JOIN cities c ON c.id=l.city_id
     LEFT JOIN states st ON st.id=l.state_id
     WHERE r.reporter_user_id=$1
     ORDER BY r.created_at DESC,r.id DESC
     LIMIT 500`,
    [Number(userId)]
  );
  return result.rows;
}
async function getLeadPartnerReports(userId){
  const result=await pool.query(
    `SELECT
       r.id,
       r.lead_id,
       r.reporter_user_id,
       r.reason,
       r.details,
       r.status,
       r.created_at,
       r.reviewed_at,
       r.reviewed_by,
       r.updated_at,
       l.customer_name,
       l.customer_phone,
       l.customer_email,
       l.industry_id,
       l.service_id,
       l.city_id,
       l.state_id,
       l.status AS lead_status,
       l.created_at AS lead_created_at,
       i.name AS industry_name,
       s.name AS service_name,
       c.name AS city_name,
       st.name AS state_name,
       reporter.name AS reporter_name,
       reporter.email AS reporter_email,
       reviewer.name AS reviewer_name
     FROM lead_reports r
     INNER JOIN leads l ON l.id=r.lead_id
     INNER JOIN lead_partners lp ON lp.id=l.lead_partner_id
     LEFT JOIN industries i ON i.id=l.industry_id
     LEFT JOIN services s ON s.id=l.service_id
     LEFT JOIN cities c ON c.id=l.city_id
     LEFT JOIN states st ON st.id=l.state_id
     LEFT JOIN users reporter ON reporter.id=r.reporter_user_id
     LEFT JOIN users reviewer ON reviewer.id=r.reviewed_by
     WHERE lp.user_id=$1
     ORDER BY r.created_at DESC,r.id DESC
     LIMIT 500`,
    [Number(userId)]
  );
  const rows=result.rows;
  const reportedLeadIds=new Set(rows.map(row=>Number(row.lead_id)).filter(Number.isFinite));
  return {
    data:rows,
    summary:{
      total_reports:rows.length,
      reported_leads:reportedLeadIds.size,
      pending:rows.filter(row=>row.status==='pending').length,
      verified_fake:rows.filter(row=>row.status==='verified_fake').length,
      verified_genuine:rows.filter(row=>row.status==='verified_genuine').length,
      rejected:rows.filter(row=>row.status==='rejected').length
    }
  };
}
async function getAdminReports({status='pending',page=1,limit=50}={}){const allowed=['pending','verified_fake','verified_genuine','rejected','all'];const normalized=String(status||'pending').toLowerCase();if(!allowed.includes(normalized)){const e=new Error('Invalid report status');e.code='INVALID_REPORT_STATUS';throw e}const safePage=Math.max(1,Number(page)||1),safeLimit=Math.min(100,Math.max(1,Number(limit)||50)),offset=(safePage-1)*safeLimit;const where=normalized==='all'?'':'WHERE r.status=$1';const total=(await pool.query(`SELECT COUNT(*)::int AS count FROM lead_reports r ${where}`,normalized==='all'?[]:[normalized])).rows[0].count;const params=normalized==='all'?[safeLimit,offset]:[normalized,safeLimit,offset];const result=await pool.query(`SELECT r.*,l.customer_name,l.customer_phone,l.customer_email,l.status AS lead_status,i.name AS industry_name,reporter.name AS reporter_name,reporter.email AS reporter_email,reviewer.name AS reviewer_name,COALESCE(control.can_report_leads,TRUE) AS can_report_leads,COALESCE(control.false_report_count,0)::int AS false_report_count,control.restriction_reason FROM lead_reports r JOIN leads l ON l.id=r.lead_id LEFT JOIN industries i ON i.id=l.industry_id LEFT JOIN users reporter ON reporter.id=r.reporter_user_id LEFT JOIN users reviewer ON reviewer.id=r.reviewed_by LEFT JOIN lead_reporting_controls control ON control.user_id=r.reporter_user_id ${where} ORDER BY r.created_at DESC,r.id DESC LIMIT $${params.length-1} OFFSET $${params.length}`,params);return{data:result.rows,pagination:{page:safePage,limit:safeLimit,total,totalPages:Math.ceil(total/safeLimit)}}}
async function refundPaymentToWallet(client,payment,description){const paymentId=Number(payment?.id);const userId=Number(payment?.user_id);const total=Number(Number(payment?.amount??(Number(payment?.wallet_amount||0)+Number(payment?.external_amount||0))).toFixed(2));if(!Number.isInteger(paymentId)||paymentId<=0||!Number.isInteger(userId)||userId<=0||total<=0)return{refundedAmount:0,balanceAfter:null,walletTransactionId:null};await client.query('SELECT id FROM payments WHERE id=$1 FOR UPDATE',[paymentId]);const existing=(await client.query(`SELECT id,amount,balance_after FROM wallet_transactions WHERE payment_id=$1 AND type='refund' FOR UPDATE`,[paymentId])).rows[0];if(existing)return{refundedAmount:Number(existing.amount),balanceAfter:Number(existing.balance_after),walletTransactionId:existing.id};const wallet=(await client.query(`INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING id,balance`,[userId])).rows[0];const locked=(await client.query('SELECT id,balance FROM wallets WHERE id=$1 FOR UPDATE',[wallet.id])).rows[0];const next=Number((Number(locked.balance||0)+total).toFixed(2));await client.query('UPDATE wallets SET balance=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2',[next,locked.id]);const tx=(await client.query(`INSERT INTO wallet_transactions(wallet_id,user_id,type,amount,balance_after,reference_type,reference_id,payment_id,description) VALUES($1,$2,'refund',$3,$4,'payment',$5,$6,$7) RETURNING id`,[locked.id,userId,total,paymentId,paymentId,paymentId,description||'Verified fake lead refund'])).rows[0];return{refundedAmount:total,balanceAfter:next,walletTransactionId:tx.id}}
async function refundFakeLead(client,report){const purchases=(await client.query(`SELECT lp.*,p.status AS payment_status,p.payment_method,p.wallet_amount,p.external_amount,p.amount AS payment_amount,p.coupon_id FROM lead_purchases lp LEFT JOIN payments p ON p.id=lp.payment_id WHERE lp.lead_id=$1 AND lp.status='paid' ORDER BY lp.id FOR UPDATE OF lp`,[report.lead_id])).rows;const refunds=[];for(const purchase of purchases){const paymentId=purchase.payment_id;if(paymentId){const payment=(await client.query('SELECT * FROM payments WHERE id=$1 FOR UPDATE',[paymentId])).rows[0];if(payment){const refund=await refundPaymentToWallet(client,payment,`Refund for verified fake lead #${report.lead_id}`);refunds.push({userId:Number(payment.user_id),paymentId:Number(payment.id),amount:refund.refundedAmount,balanceAfter:refund.balanceAfter,walletTransactionId:refund.walletTransactionId});await couponService.releaseForPayment(client,paymentId);if(payment.status!=='refunded')await client.query("UPDATE payments SET status='refunded',updated_at=CURRENT_TIMESTAMP WHERE id=$1",[paymentId])}}await client.query("UPDATE lead_purchases SET status='refunded',updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND status='paid'",[purchase.id]);await leadPartnerEarningsService.reverseForPurchase(client,purchase.id,`Verified fake lead #${report.lead_id}`)}await client.query('DELETE FROM lead_entitlement_claims WHERE lead_id=$1',[report.lead_id]);const allocationTable=(await client.query("SELECT to_regclass('public.investment_revenue_allocations') AS table_name")).rows[0]?.table_name;if(allocationTable)await client.query('DELETE FROM investment_revenue_allocations WHERE lead_purchase_id IN (SELECT id FROM lead_purchases WHERE lead_id=$1)',[report.lead_id]);return refunds}
async function reviewReport({reportId,reviewerUserId,status}){const id=Number(reportId);if(!Number.isInteger(id)||id<=0)throw new Error('Invalid report ID');if(!REVIEW_STATUSES.includes(status)){const e=new Error('Invalid review status');e.code='INVALID_REVIEW_STATUS';throw e}const client=await pool.connect();try{await client.query('BEGIN');const report=(await client.query('SELECT * FROM lead_reports WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!report){const e=new Error('Report not found');e.code='REPORT_NOT_FOUND';throw e}if(report.status!=='pending'){const e=new Error('Only pending reports can be reviewed');e.code='REPORT_ALREADY_REVIEWED';throw e}let refunds=[];if(status==='verified_fake'){await client.query("UPDATE leads SET status='invalid',updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND status<>'invalid'",[report.lead_id]);refunds=await refundFakeLead(client,report)}const updated=(await client.query('UPDATE lead_reports SET status=$1,reviewed_by=$2,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *',[status,reviewerUserId,id])).rows[0];if(status==='verified_genuine')await client.query("INSERT INTO lead_reporting_controls(user_id,false_report_count,updated_by) VALUES($1,1,$2) ON CONFLICT(user_id) DO UPDATE SET false_report_count=lead_reporting_controls.false_report_count+1,updated_by=EXCLUDED.updated_by,updated_at=CURRENT_TIMESTAMP",[report.reporter_user_id,reviewerUserId]);await client.query('COMMIT');return {...updated,refunds,refunded_amount:refunds.reduce((sum,item)=>sum+Number(item.amount||0),0)}}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}}
async function setReportingControl({userId,canReportLeads,reason,adminUserId}){const id=Number(userId);if(!Number.isInteger(id)||id<=0)throw new Error('Invalid user ID');return(await pool.query('INSERT INTO lead_reporting_controls(user_id,can_report_leads,restriction_reason,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET can_report_leads=EXCLUDED.can_report_leads,restriction_reason=EXCLUDED.restriction_reason,updated_by=EXCLUDED.updated_by,updated_at=CURRENT_TIMESTAMP RETURNING *',[id,Boolean(canReportLeads),Boolean(canReportLeads)?null:String(reason||'Lead reporting disabled by admin').trim()||'Lead reporting disabled by admin',adminUserId])).rows[0]}
module.exports={REPORT_REASONS,REVIEW_STATUSES,getReportingControl,createReport,getMyReports,getLeadPartnerReports,getAdminReports,reviewReport,setReportingControl};