const pool=require('../config/database');
const expertDirectoryService=require('./expertDirectoryService');
const notifications=require('./notificationService');
const marketplace=require('./projectMarketplaceLeadService');
const {normalizeName,normalizePhone,normalizeEmail}=require('./publicContactValidationService');

function bad(message,code='INVALID_PROJECT_CALLBACK'){
  return Object.assign(new Error(message),{code});
}
async function requestCallback(projectId,input={}){
  const id=Number(projectId);
  if(!Number.isSafeInteger(id)||id<1)throw bad('Project not found','PROJECT_NOT_FOUND');
  if(input.website)throw bad('Unable to submit request');
  if(input.consent!==true||input.marketplaceConsent!==true)throw bad('Please agree to your request being shared with this professional and other relevant ProPulse professionals');
  const pincode=String(input.pincode||'').trim();
  if(!/^\d{6}$/.test(pincode))throw bad('Enter a valid 6-digit project PIN code');
  const name=normalizeName(input.name);
  const phone=normalizePhone(input.phone);
  const email=normalizeEmail(input.email);
  const message=String(input.message||'').trim();
  if(message.length>1000)throw bad('Please shorten your message to 1000 characters');
  const settings=await expertDirectoryService.getSettings();
  if(!settings.directoryEnabled||!settings.showProjects)throw bad('Project not available','PROJECT_NOT_FOUND');
  const project=(await pool.query(
    `SELECT p.id,p.title,bp.user_id AS business_user_id
       FROM business_profile_projects p
       JOIN business_profiles bp ON bp.id=p.business_profile_id
       JOIN users u ON u.id=bp.user_id
       WHERE p.id=$1 AND p.is_published=TRUE AND p.completion_year BETWEEN 1950 AND EXTRACT(YEAR FROM CURRENT_DATE)
       AND u.role='business' AND u.is_active=TRUE AND bp.public_profile_enabled=TRUE
       AND COALESCE(TRIM(bp.business_name),'')<>''
       LIMIT 1`,[id]
  )).rows[0];
  if(!project)throw bad('Project not found','PROJECT_NOT_FOUND');
  const status=await expertDirectoryService.getUserDirectoryStatus(project.business_user_id);
  if(!status.eligible)throw bad('Project not available','PROJECT_NOT_FOUND');
  const result=await pool.query(
    `INSERT INTO project_callback_requests
      (project_id,project_title,business_user_id,customer_name,customer_phone,customer_email,message)
      SELECT $1,$7,$2,$3,$4,$5,$6
      WHERE NOT EXISTS (
        SELECT 1 FROM project_callback_requests
        WHERE project_id=$1 AND customer_phone=$4
        AND created_at>CURRENT_TIMESTAMP-INTERVAL '1 hour'
      )
      RETURNING id`,
    [id,project.business_user_id,name,phone,email,message||null,String(project.title||'Project').slice(0,180)]
  );
  if(!result.rowCount){
    const prior=await pool.query(
      `SELECT id FROM project_callback_requests
       WHERE project_id=$1 AND customer_phone=$2
         AND created_at>CURRENT_TIMESTAMP-INTERVAL '1 hour'
       ORDER BY created_at DESC,id DESC LIMIT 1`,[id,phone]
    );
    const requestId=prior.rows[0]?.id||null;
    if(!requestId)return {success:true,duplicate:true};
    await marketplace.flagPending('callback',requestId,pincode);
    const market=await marketplace.sync('callback',requestId);
    return {success:true,duplicate:true,requestId,marketplaceLeadId:market.leadId||null,marketplaceStatus:market.status};
  }
  const requestId=result.rows[0].id;
  await marketplace.flagPending('callback',requestId,pincode);
  const market=await marketplace.sync('callback',requestId);
  try{
    await notifications.notifyUser({
      userId:project.business_user_id,
      type:'project_callback_request',category:'lead',severity:'info',
      title:'New project callback request',
      message:`A customer requested a callback about "${String(project.title).slice(0,120)}". View the protected request in your Requests workspace.`,
      actionUrl:'/professional-requests',relatedType:'project_callback',relatedId:requestId,
      dedupeKey:`project-callback-${requestId}`,
    });
  }catch(error){console.error('Project callback notification failed:',error.message);}
  try{
    await notifications.notifyAdmins({
      type:'project_callback_request',category:'lead',severity:'info',
      title:'New project callback lead #'+requestId,
      message:'A customer requested a callback for '+String(project.title).slice(0,110)+'. Coordinate the enquiry and manage customer contact access.',
      actionUrl:'/admin',relatedType:'project_callback',relatedId:requestId,
      dedupeKey:'admin-project-callback-'+requestId,
    });
  }catch(error){console.error('Admin project callback notification failed:',error.message);}
  return {success:true,requestId,marketplaceLeadId:market.leadId||null,marketplaceStatus:market.status};
}

async function requestProfileCallback(expertId,input={}){
  const id=Number(expertId);
  if(!Number.isSafeInteger(id)||id<1)throw bad('Professional profile not found','PROFILE_NOT_FOUND');
  if(input.website)throw bad('Unable to submit request');
  if(input.consent!==true)throw bad('Please confirm that ProPulse may coordinate your callback');
  const name=normalizeName(input.name);
  const phone=normalizePhone(input.phone);
  const email=normalizeEmail(input.email);
  const message=String(input.message||'').trim();
  if(message.length>1000)throw bad('Please shorten your message to 1000 characters');
  const settings=await expertDirectoryService.getSettings();
  if(!settings.directoryEnabled)throw bad('Professional profile not found','PROFILE_NOT_FOUND');
  const profile=(await pool.query(
    `SELECT bp.user_id,bp.business_name FROM business_profiles bp
     JOIN users u ON u.id=bp.user_id
     WHERE bp.id=$1 AND u.role='business' AND u.is_active=TRUE
     AND bp.public_profile_enabled=TRUE AND COALESCE(TRIM(bp.business_name),'')<>'' LIMIT 1`,[id]
  )).rows[0];
  if(!profile)throw bad('Professional profile not found','PROFILE_NOT_FOUND');
  const eligibility=await expertDirectoryService.getUserDirectoryStatus(profile.user_id);
  if(!eligibility.eligible)throw bad('Professional profile not found','PROFILE_NOT_FOUND');
  const title=`Profile enquiry: ${String(profile.business_name).slice(0,155)}`;
  const result=await pool.query(
    `INSERT INTO project_callback_requests
      (project_id,project_title,business_user_id,customer_name,customer_phone,customer_email,message)
     SELECT NULL,$1,$2,$3,$4,$5,$6
     WHERE NOT EXISTS (
       SELECT 1 FROM project_callback_requests
       WHERE project_id IS NULL AND business_user_id=$2 AND customer_phone=$4
         AND created_at>CURRENT_TIMESTAMP-INTERVAL '1 hour'
     ) RETURNING id`,
    [title.slice(0,180),profile.user_id,name,phone,email,message||null]
  );
  if(!result.rowCount)return {success:true,duplicate:true};
  try{
    await notifications.notifyUser({
      userId:profile.user_id,type:'project_callback_request',category:'lead',severity:'info',
      title:'New professional profile callback',
      message:'A customer requested a callback through your public profile. View the protected request in your Requests workspace.',
      actionUrl:'/professional-requests',relatedType:'project_callback',relatedId:result.rows[0].id,
      dedupeKey:`profile-callback-${result.rows[0].id}`,
    });
  }catch(error){console.error('Profile callback notification failed:',error.message);}
  return {success:true};
}
function maskedPhone(value){
  const digits=String(value||'').replace(/\D/g,'');
  return digits ? '•'.repeat(Math.max(6,digits.length-2))+digits.slice(-2) : 'Protected';
}
function maskedEmail(value){
  const email=String(value||'').trim();
  if(!email)return null;
  const [local,domain]=email.split('@');
  if(!domain)return 'Protected';
  const [host,...suffix]=domain.split('.');
  return `${local?.slice(0,1)||'*'}***@${host?.slice(0,1)||'*'}***${suffix.length?'.'+suffix.join('.'):''}`;
}
function redactContactText(value){
  if(value==null)return null;
  return String(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email hidden]')
    .replace(/(?:\+?\d[\d \-().]{8,}\d)/g,'[phone protected]')
    .replace(/(?:https?:\/\/|www\.)\S+/gi,'[link protected]');
}
async function listForProfessional(userId){
  const id=Number(userId);
  if(!Number.isSafeInteger(id)||id<1)return [];
  return (await pool.query(
    `SELECT r.id,r.project_id,r.project_title,r.customer_name,
       r.customer_phone,r.customer_email,r.message,r.status,r.created_at
       FROM project_callback_requests r
       WHERE r.business_user_id=$1
       ORDER BY r.created_at DESC,r.id DESC LIMIT 100`,[id]
  )).rows.map(row=>({...row,customer_name:redactContactText(row.customer_name),customer_phone:maskedPhone(row.customer_phone),customer_email:maskedEmail(row.customer_email),message:redactContactText(row.message)}));
}

async function listForAdmin(){
  return (await pool.query(
    `SELECT r.id,r.project_id,r.project_title,r.customer_name,r.customer_phone,
       r.customer_email,r.message,r.status,r.created_at,bp.business_name
     FROM project_callback_requests r
     LEFT JOIN business_profiles bp ON bp.user_id=r.business_user_id
     ORDER BY r.created_at DESC,r.id DESC LIMIT 150`
  )).rows;
}
async function setAdminStatus(id,status){
  const value=Number(id);
  if(!Number.isSafeInteger(value)||value<1)throw bad('Callback not found','PROFILE_NOT_FOUND');
  if(!['new','contacted','closed'].includes(status))throw bad('Invalid callback status');
  const result=await pool.query(
    'UPDATE project_callback_requests SET status=$2 WHERE id=$1 RETURNING id,status',[value,status]
  );
  if(!result.rowCount)throw bad('Callback not found','PROFILE_NOT_FOUND');
  return result.rows[0];
}
module.exports={requestCallback,requestProfileCallback,listForProfessional,listForAdmin,setAdminStatus};
