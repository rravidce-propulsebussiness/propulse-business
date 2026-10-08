const pool=require('../config/database');
const directory=require('./expertDirectoryService');
const notifications=require('./notificationService');
const marketplace=require('./projectMarketplaceLeadService');
const {normalizeName,normalizePhone,normalizeEmail}=require('./publicContactValidationService');
const {splitProjectQuoteRequirement}=require('./projectQuoteRequirementDetails');

function bad(message,code='INVALID_PROFESSIONAL_QUOTE'){
  return Object.assign(new Error(message),{code});
}
function text(value,max,label,{required=false}={}){
  const result=String(value||'').trim();
  if(required&&!result)throw bad(label+' is required');
  if(result.length>max)throw bad(label+' is too long');
  return result;
}
function maskPhone(value){
  const digits=String(value||'').replace(/\D/g,'');
  return digits?'•'.repeat(Math.max(6,digits.length-2))+digits.slice(-2):'Protected';
}
function maskEmail(value){
  const v=String(value||'').trim(),parts=v.split('@');
  return parts.length===2?parts[0].slice(0,1)+'***@'+parts[1].slice(0,1)+'***':null;
}
function redact(value){
  return String(value||'').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email hidden]')
    .replace(/(?:\+?\d[\d \-().]{8,}\d)/g,'[phone protected]')
    .replace(/(?:https?:\/\/|www\.)\S+/gi,'[link protected]');
}
async function submit(projectId,input={}){
  const id=Number(projectId);
  if(!Number.isSafeInteger(id)||id<1)throw bad('Project not found','PROJECT_NOT_FOUND');
  if(input.website)throw bad('Unable to submit quotation request');
  if(input.consent!==true||input.marketplaceConsent!==true)throw bad('Please agree to ProPulse sharing your request with this professional and other relevant marketplace professionals');
  const pincode=String(input.pincode||'').trim();
  if(!/^\d{6}$/.test(pincode))throw bad('Enter a valid 6-digit project PIN code');
  const name=normalizeName(input.name);
  const phone=normalizePhone(input.phone);
  const email=normalizeEmail(input.email);
  const requirement=text(input.requirement,3000,'Project requirement',{required:true});
  const siteLocation=text(input.siteLocation,180,'Site location');
  const area=text(input.area,120,'Project area');
  const budget=text(input.budget,120,'Budget');
  const preferredPackage=text(input.preferredPackage,160,'Preferred package');
  const settings=await directory.getSettings();
  if(!settings.directoryEnabled||!settings.showProjects)throw bad('Project not available','PROJECT_NOT_FOUND');
  const {rows}=await pool.query(
    `SELECT p.id,p.title,p.project_type,bp.user_id AS owner_id,bp.id AS business_profile_id
     FROM business_profile_projects p
     JOIN business_profiles bp ON bp.id=p.business_profile_id
     JOIN users u ON u.id=bp.user_id
     WHERE p.id=$1 AND p.is_published=TRUE
       AND p.completion_year BETWEEN 1950 AND EXTRACT(YEAR FROM CURRENT_DATE)
       AND u.role='business' AND u.is_active=TRUE
       AND COALESCE(bp.public_profile_enabled,TRUE)=TRUE
       AND COALESCE(TRIM(bp.business_name),'')<>''
     LIMIT 1`,[id]
  );
  const project=rows[0];
  if(!project)throw bad('Project not found','PROJECT_NOT_FOUND');
  const industry=/interior|design/i.test(project.project_type)?'design':/property|estate/i.test(project.project_type)?'property':'construction';
  const status=await directory.getUserDirectoryStatus(project.owner_id);
  if(!status.eligible)throw bad('Project not available','PROJECT_NOT_FOUND');
  let selectedPackage=null;
  if(preferredPackage){
    if(!settings.showPlans)throw bad('Published packages are currently unavailable');
    const packageResult=await pool.query(
      `SELECT title,price_from,price_unit FROM business_profile_service_plans
       WHERE business_profile_id=$1 AND is_published=TRUE AND LOWER(TRIM(title))=LOWER($2) AND industry=$3
       LIMIT 1`,[project.business_profile_id,preferredPackage,industry]
    );
    selectedPackage=packageResult.rows[0]||null;
    if(!selectedPackage)throw bad('Choose one of this professional’s published packages to continue');
  }
  const saved=await pool.query(
    `INSERT INTO professional_project_quote_requests
      (project_id,project_title,business_user_id,customer_name,customer_phone,customer_email,
       requirement,site_location,area_text,budget_text,preferred_package,
       package_price_from_snapshot,package_price_unit_snapshot)
     SELECT $1::integer,$2::varchar(180),$3::integer,$4::varchar(160),
            $5::varchar(16),$6::varchar(255),$7::text,$8::varchar(180),
            $9::varchar(120),$10::varchar(120),$11::varchar(160),
            $12::numeric(12,2),$13::varchar(24)
     WHERE NOT EXISTS(
       SELECT 1 FROM professional_project_quote_requests
       WHERE project_id=$1::integer AND customer_phone=$5::varchar(16)
       AND created_at>CURRENT_TIMESTAMP-INTERVAL '1 hour'
     ) RETURNING id`,
    [id,String(project.title).slice(0,180),project.owner_id,name,phone,email||null,requirement,
     siteLocation||null,area||null,budget||null,selectedPackage?.title||null,
     selectedPackage?.price_from??null,selectedPackage?.price_unit||null]
  );
  if(!saved.rowCount){
    const prior=await pool.query(
      `SELECT id FROM professional_project_quote_requests
       WHERE project_id=$1 AND customer_phone=$2
         AND created_at>CURRENT_TIMESTAMP-INTERVAL '1 hour'
       ORDER BY created_at DESC,id DESC LIMIT 1`,
      [id,phone]
    );
    const requestId=prior.rows[0]?.id||null;
    if(!requestId)return {accepted:true,duplicate:true};
    await marketplace.flagPending('quote',requestId,pincode);
    const market=await marketplace.sync('quote',requestId);
    return {accepted:true,duplicate:true,requestId,marketplaceLeadId:market.leadId||null,marketplaceStatus:market.status};
  }
  const quoteId=saved.rows[0].id;
  await marketplace.flagPending('quote',quoteId,pincode);
  const market=await marketplace.sync('quote',quoteId);
  try{
    await notifications.notifyUser({
      userId:project.owner_id,type:'professional_quote_request',category:'lead',severity:'info',
      title:'New project-specific quotation lead',
      message:'A customer requested a quotation for '+String(project.title).slice(0,100)+'. Review their scope and prepare your package and pricing.',
      actionUrl:'/professional-requests?tab=quotes',relatedType:'professional_quote',relatedId:quoteId,
      dedupeKey:'professional-quote-'+quoteId,
    });
  }catch(error){console.error('Professional quotation notification failed:',error.message)}
  try{
    await notifications.notifyAdmins({
      type:'professional_quote_request',category:'lead',severity:'info',
      title:'New professional quotation lead #'+quoteId,
      message:'A customer requested a '+(selectedPackage?'package':'custom')+' quotation for '+String(project.title).slice(0,100)+'. Review the lead and coordinate protected customer contact access.',
      actionUrl:'/admin',relatedType:'professional_quote',relatedId:quoteId,
      dedupeKey:'admin-professional-quote-'+quoteId,
    });
  }catch(error){console.error('Admin quotation notification failed:',error.message)}
  return {accepted:true,requestId:quoteId,marketplaceLeadId:market.leadId||null,marketplaceStatus:market.status};
}
async function listForProfessional(userId){
  const id=Number(userId);
  if(!Number.isSafeInteger(id)||id<1)return [];
  const rows=(await pool.query(
    `SELECT id,project_id,project_title,customer_name,customer_phone,customer_email,
      requirement,site_location,area_text,budget_text,preferred_package,
      package_price_from_snapshot,package_price_unit_snapshot,
      marketplace_lead_id,marketplace_sync_status,marketplace_sync_error,status,
      quoted_package,quoted_price,quoted_scope,professional_notes,quoted_at,created_at
     FROM professional_project_quote_requests
     WHERE business_user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100`,[id]
  )).rows;
  const access=require('./professionalRequestAccessService');
  const decorated=await access.attachAccess(userId,rows,'quote');
  return decorated.map(row=>{
    // Each wizard answer is a separate labelled field. The free-text
    // Requirement must never be fabricated from the other form answers.
    const {fields,written}=(()=>{const result=splitProjectQuoteRequirement(row.requirement);return {fields:result.fields,written:result.requirement}})();
    const requirementFields=Object.fromEntries(
      Object.entries(fields).filter(([,value])=>String(value||'').trim())
        .map(([label,value])=>[label,redact(value)])
    );
    return{
      ...row,
      customer_name:redact(row.customer_name),
      customer_phone:row.access?.unlocked?row.customer_phone:maskPhone(row.customer_phone),
      customer_email:row.access?.unlocked?row.customer_email:maskEmail(row.customer_email),
      requirement:written?redact(written):'',
      requirement_fields:requirementFields,
      site_location:redact(row.site_location),
    };
  });
}
async function updateByProfessional(userId,requestId,input={}){
  const id=Number(requestId);
  if(!Number.isSafeInteger(id)||id<1)throw bad('Quotation request not found','QUOTE_NOT_FOUND');
  const owner=Number(userId);
  if(!Number.isSafeInteger(owner)||owner<1)throw bad('Business account required','QUOTE_FORBIDDEN');
  if(!await require('./professionalRequestAccessService').isUnlocked(userId,'quote',id))
    throw bad('Accept this enquiry before preparing or submitting a quotation','ENQUIRY_NOT_ACCEPTED');
  const quoteStatus=String(input.status||'in_review');
  if(!['in_review','quoted','closed'].includes(quoteStatus))throw bad('Invalid quotation status');
  const packageName=text(input.packageName,160,'Selected package');
  const scope=text(input.scope,3000,'Quotation scope');
  const notes=text(input.notes,1500,'Professional notes');
  const rawPrice=input.price;
  const price=rawPrice==null||rawPrice===''?null:Number(rawPrice);
  if(price!==null&&(!Number.isFinite(price)||price<=0||price>9999999999))throw bad('Enter a valid quotation price');
  if(quoteStatus==='quoted'&&(!packageName||price===null||!scope))throw bad('Select a package, enter the price and describe the scope before marking quoted');
  const result=await pool.query(
    `UPDATE professional_project_quote_requests
     SET status=$3,quoted_package=$4,quoted_price=$5,quoted_scope=$6,
         professional_notes=$7,quoted_at=CASE WHEN $3='quoted' THEN CURRENT_TIMESTAMP ELSE quoted_at END,
         updated_at=CURRENT_TIMESTAMP
     WHERE id=$1 AND business_user_id=$2
     RETURNING id,status,quoted_package,quoted_price,quoted_scope,professional_notes,quoted_at`,
    [id,owner,quoteStatus,packageName||null,price,scope||null,notes||null]
  );
  if(!result.rowCount)throw bad('Quotation request not found','QUOTE_NOT_FOUND');
  if(quoteStatus==='quoted'){
    try{
      await notifications.notifyAdmins({
        type:'professional_quote_prepared',category:'lead',severity:'info',
        title:'Professional quotation ready for coordination',
        message:'A professional prepared quote #'+id+'. Coordinate the response to the customer using the protected lead.',
        actionUrl:'/admin',relatedType:'professional_quote',relatedId:id,dedupeKey:'quote-ready-'+id+'-'+Date.now(),
      });
    }catch(error){console.error('Admin quote handoff notification failed:',error.message)}
  }
  return result.rows[0];
}
async function listForAdmin(){
  return (await pool.query(
    `SELECT q.id,q.project_id,q.project_title,q.customer_name,q.customer_phone,
      q.customer_email,q.requirement,q.site_location,q.area_text,q.budget_text,
      q.preferred_package,q.package_price_from_snapshot,q.package_price_unit_snapshot,
      q.status,q.quoted_package,q.quoted_price,q.quoted_scope,
      q.professional_notes,q.quoted_at,q.created_at,bp.business_name
     FROM professional_project_quote_requests q
     LEFT JOIN business_profiles bp ON bp.user_id=q.business_user_id
     ORDER BY q.created_at DESC,q.id DESC LIMIT 200`
  )).rows;
}
module.exports={submit,listForProfessional,updateByProfessional,listForAdmin};
