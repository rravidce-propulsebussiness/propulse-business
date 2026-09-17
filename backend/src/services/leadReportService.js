const pool=require('../config/database');

const REPORT_REASONS=['fake','wrong_number','not_interested','duplicate','other'];
const REVIEW_STATUSES=['verified_fake','verified_genuine','rejected'];

async function getReportingControl(userId){
  const result=await pool.query('SELECT can_report_leads,false_report_count,restriction_reason FROM lead_reporting_controls WHERE user_id=$1',[userId]);
  return result.rows[0]||{can_report_leads:true,false_report_count:0,restriction_reason:null};
}

async function hasLeadAccess(userId,leadId){
  const result=await pool.query("SELECT 1 FROM lead_purchases WHERE user_id=$1 AND lead_id=$2 AND status='paid' UNION ALL SELECT 1 FROM lead_entitlement_claims WHERE user_id=$1 AND lead_id=$2 AND (expires_at IS NULL OR expires_at>=CURRENT_TIMESTAMP) LIMIT 1",[userId,leadId]);
  return result.rows.length>0;
}

async function createReport({leadId,reporterUserId,reason,details}){
  const id=Number(leadId);
  if(!Number.isInteger(id)||id<=0)throw new Error('Invalid lead ID');
  if(!REPORT_REASONS.includes(reason)){const e=new Error('Invalid report reason');e.code='INVALID_REPORT_REASON';throw e;}
  const control=await getReportingControl(reporterUserId);
  if(!control.can_report_leads){const e=new Error(control.restriction_reason||'Lead reporting is currently disabled for your account');e.code='REPORTING_DISABLED';throw e;}
  if(!(await hasLeadAccess(reporterUserId,id))){const e=new Error('You can report a lead only after you have access to it');e.code='REPORT_NOT_ELIGIBLE';throw e;}
  const lead=(await pool.query('SELECT id,status FROM leads WHERE id=$1',[id])).rows[0];
  if(!lead){const e=new Error('Lead not found');e.code='LEAD_NOT_FOUND';throw e;}
  if(lead.status==='invalid'){const e=new Error('This lead has already been marked invalid');e.code='LEAD_ALREADY_INVALID';throw e;}
  const existing=(await pool.query('SELECT id,status FROM lead_reports WHERE lead_id=$1 AND reporter_user_id=$2 ORDER BY id DESC LIMIT 1',[id,reporterUserId])).rows[0];
  if(existing?.status==='pending'){const e=new Error('You already have a pending report for this lead');e.code='REPORT_ALREADY_PENDING';throw e;}
  return (await pool.query('INSERT INTO lead_reports(lead_id,reporter_user_id,reason,details) VALUES($1,$2,$3,$4) RETURNING *',[id,reporterUserId,reason,String(details||'').trim()||null])).rows[0];
}

async function getMyReports(userId){
  const result=await pool.query(`SELECT r.*,l.customer_name,l.industry_id,l.status AS lead_status,i.name AS industry_name FROM lead_reports r JOIN leads l ON l.id=r.lead_id LEFT JOIN industries i ON i.id=l.industry_id WHERE r.reporter_user_id=$1 ORDER BY r.created_at DESC,r.id DESC`,[userId]);
  return result.rows;
}

async function getAdminReports({status='pending',page=1,limit=50}={}){
  const allowed=['pending','verified_fake','verified_genuine','rejected','all'];
  const normalized=String(status||'pending').toLowerCase();
  if(!allowed.includes(normalized)){const e=new Error('Invalid report status');e.code='INVALID_REPORT_STATUS';throw e;}
  const safePage=Math.max(1,Number(page)||1),safeLimit=Math.min(100,Math.max(1,Number(limit)||50)),offset=(safePage-1)*safeLimit;
  const where=normalized==='all'?'':'WHERE r.status=$1';
  const total=(await pool.query(`SELECT COUNT(*)::int AS count FROM lead_reports r ${where}`,normalized==='all'?[]:[normalized])).rows[0].count;
  const params=normalized==='all'?[safeLimit,offset]:[normalized,safeLimit,offset];
  const result=await pool.query(`SELECT r.*,l.customer_name,l.customer_phone,l.customer_email,l.status AS lead_status,l.lead_partner_id,i.name AS industry_name,reporter.name AS reporter_name,reporter.email AS reporter_email,reviewer.name AS reviewer_name FROM lead_reports r JOIN leads l ON l.id=r.lead_id LEFT JOIN industries i ON i.id=l.industry_id LEFT JOIN users reporter ON reporter.id=r.reporter_user_id LEFT JOIN users reviewer ON reviewer.id=r.reviewed_by ${where} ORDER BY r.created_at DESC,r.id DESC LIMIT $${params.length-1} OFFSET $${params.length}`,params);
  return {data:result.rows,pagination:{page:safePage,limit:safeLimit,total,totalPages:Math.ceil(total/safeLimit)}};
}

async function reviewReport({reportId,reviewerUserId,status}){
  const id=Number(reportId);
  if(!Number.isInteger(id)||id<=0)throw new Error('Invalid report ID');
  if(!REVIEW_STATUSES.includes(status)){const e=new Error('Invalid review status');e.code='INVALID_REVIEW_STATUS';throw e;}
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const report=(await client.query('SELECT * FROM lead_reports WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!report){const e=new Error('Report not found');e.code='REPORT_NOT_FOUND';throw e;}
    if(report.status!=='pending'){const e=new Error('Only pending reports can be reviewed');e.code='REPORT_ALREADY_REVIEWED';throw e;}
    const updated=(await client.query('UPDATE lead_reports SET status=$1,reviewed_by=$2,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *',[status,reviewerUserId,id])).rows[0];
    if(status==='verified_fake')await client.query("UPDATE leads SET status='invalid',updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND status<>'invalid'",[report.lead_id]);
    if(status==='verified_genuine')await client.query("INSERT INTO lead_reporting_controls(user_id,false_report_count,updated_by) VALUES($1,1,$2) ON CONFLICT(user_id) DO UPDATE SET false_report_count=lead_reporting_controls.false_report_count+1,updated_by=EXCLUDED.updated_by,updated_at=CURRENT_TIMESTAMP",[report.reporter_user_id,reviewerUserId]);
    await client.query('COMMIT');
    return updated;
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}

async function setReportingControl({userId,canReportLeads,reason,adminUserId}){
  const id=Number(userId);
  if(!Number.isInteger(id)||id<=0)throw new Error('Invalid user ID');
  return (await pool.query('INSERT INTO lead_reporting_controls(user_id,can_report_leads,restriction_reason,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET can_report_leads=EXCLUDED.can_report_leads,restriction_reason=EXCLUDED.restriction_reason,updated_by=EXCLUDED.updated_by,updated_at=CURRENT_TIMESTAMP RETURNING *',[id,Boolean(canReportLeads),Boolean(canReportLeads)?null:String(reason||'Lead reporting disabled by admin').trim()||'Lead reporting disabled by admin',adminUserId])).rows[0];
}

module.exports={REPORT_REASONS,REVIEW_STATUSES,getReportingControl,createReport,getMyReports,getAdminReports,reviewReport,setReportingControl};
