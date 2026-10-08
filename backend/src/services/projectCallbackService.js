const pool=require('../config/database');
const expertDirectoryService=require('./expertDirectoryService');
const notifications=require('./notificationService');
const {normalizeName,normalizePhone,normalizeEmail}=require('./publicContactValidationService');

function bad(message,code='INVALID_PROJECT_CALLBACK'){
  return Object.assign(new Error(message),{code});
}
async function requestCallback(projectId,input={}){
  const id=Number(projectId);
  if(!Number.isSafeInteger(id)||id<1)throw bad('Project not found','PROJECT_NOT_FOUND');
  if(input.website)throw bad('Unable to submit request');
  if(input.consent!==true)throw bad('Please agree to share your details with this professional');
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
       WHERE p.id=$1 AND p.is_published=TRUE
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
  if(!result.rowCount)return {success:true,duplicate:true};
  const requestId=result.rows[0].id;
  try{
    await notifications.notifyUser({
      userId:project.business_user_id,
      type:'project_callback_request',category:'lead',severity:'info',
      title:'New project callback request',
      message:`A customer requested a callback about "${String(project.title).slice(0,120)}". View their details in your business profile.`,
      actionUrl:'/profile',relatedType:'project_callback',relatedId:requestId,
      dedupeKey:`project-callback-${requestId}`,
    });
  }catch(error){console.error('Project callback notification failed:',error.message);}
  return {success:true};
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
  )).rows;
}
module.exports={requestCallback,listForProfessional};
