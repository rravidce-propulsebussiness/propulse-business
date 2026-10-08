const pool=require('../config/database');
const flows=require('./customerFlowService');
const pins=require('./pincodeDetectionService');
const leads=require('./leadService');
const notifications=require('./notificationService');
const {parseProjectQuoteRequirement}=require('./projectQuoteRequirementDetails');

const TYPES={
  quote:{table:'professional_project_quote_requests',source:'professional_project_quote'},
  callback:{table:'project_callback_requests',source:'professional_project_callback'},
  profile:{table:'project_callback_requests',source:'professional_profile_callback'},
};
function type(kind){
  if(!TYPES[kind])throw Object.assign(new Error('Invalid project request type'),{code:'INVALID_PROJECT_REQUEST'});
  return TYPES[kind];
}
function industry(projectType){
  const text=String(projectType||'').toLowerCase();
  if(/interior|design/.test(text))return 'design';
  if(/property|estate/.test(text))return 'property';
  if(/construct|build|villa|commercial|residential/.test(text))return 'build';
  throw Object.assign(new Error('Project industry needs correction'),{code:'PROJECT_INDUSTRY_REQUIRED'});
}
function sanitize(value){
  return String(value||'').split('\n')
    .filter(line=>!/^(Reference project|Published professional):/i.test(line.trim()))
    .join('\n')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email protected]')
    .replace(/(?:\+?91[\s-]?)?[6-9]\d{9}/g,'[phone protected]')
    .slice(0,2900);
}
async function getRequest(kind,id){
  if(kind==='profile'){
    // Profile enquiries are private to the selected professional: never publish
    // them into the general lead marketplace or infer a project from a profile.
    const result=await pool.query(`
      SELECT r.*,bp.id AS business_profile_id,COALESCE(i.name,'') AS project_type
      FROM project_callback_requests r
      JOIN business_profiles bp ON bp.user_id=r.business_user_id
      LEFT JOIN LATERAL (
        SELECT bps.industry_id FROM business_profile_services bps
        WHERE bps.business_profile_id=bp.id AND bps.is_active=TRUE
        ORDER BY bps.id LIMIT 1
      ) assigned ON TRUE
      LEFT JOIN industries i ON i.id=assigned.industry_id
      WHERE r.id=$1 AND r.project_id IS NULL`,[Number(id)]);
    return result.rows[0]||null;
  }
  const result=await pool.query(
    'SELECT r.*,p.project_type,p.business_profile_id FROM '+type(kind).table+
    ' r JOIN business_profile_projects p ON p.id=r.project_id'+
    ' JOIN business_profiles bp ON bp.id=p.business_profile_id AND bp.user_id=r.business_user_id WHERE r.id=$1',
    [Number(id)]
  );
  return result.rows[0]||null;
}
async function updateLink(kind,id,{leadId=null,status,error=null}){
  await pool.query('UPDATE '+type(kind).table+
    ' SET marketplace_lead_id=$2,marketplace_sync_status=$3,marketplace_sync_error=$4 WHERE id=$1',
    [Number(id),leadId,status,error?String(error).slice(0,255):null]);
}
async function flagPending(kind,id,pincode){
  const pin=String(pincode||'').trim();
  if(!/^\d{6}$/.test(pin))throw Object.assign(new Error('Enter a 6-digit project PIN code'),{code:'INVALID_PINCODE'});
  await pool.query('UPDATE '+type(kind).table+
    " SET marketplace_pincode=$2,marketplace_sync_status=CASE WHEN marketplace_lead_id IS NULL THEN 'pending' ELSE marketplace_sync_status END,marketplace_sync_error=NULL WHERE id=$1",
    [Number(id),pin]);
}
async function sync(kind,id,{notify=true}={}){
  const record=await getRequest(kind,id);
  if(!record)throw Object.assign(new Error('Project request not found'),{code:'PROJECT_REQUEST_NOT_FOUND'});
  if(record.marketplace_sync_status==='not_requested')return{status:'not_requested'};
  if(record.marketplace_lead_id)return{status:record.marketplace_sync_status,leadId:Number(record.marketplace_lead_id),duplicate:true};
  try{
    const key=industry(record.project_type);
    const flow=await flows.getPublishedFlow(key);
    const pin=String(record.marketplace_pincode||'');
    if(!/^\d{6}$/.test(pin))throw Object.assign(new Error('Project PIN code is missing'),{code:'PIN_REQUIRED'});
    const detected=await pins.detectPincode(pin);
    if(!detected?.city?.id||['NEEDS_MAPPING','NO_MATCH'].includes(detected.status))
      throw Object.assign(new Error('Project PIN code requires city mapping'),{code:'PIN_CITY_MAPPING_REQUIRED'});
    const details=sanitize(kind==='quote'?record.requirement:record.message);
    const answeredFields=kind==='quote'?parseProjectQuoteRequirement(record.requirement):{};
    if(kind==='quote'&&record.area_text&&!answeredFields['Built-up Area']&&!answeredFields['Project Area'])
      answeredFields['Project Area']=String(record.area_text).slice(0,120);
    if(kind==='quote'&&record.budget_text&&!answeredFields.Budget)
      answeredFields.Budget=String(record.budget_text).slice(0,120);
    // A marketplace Requirement is only the text entered in the form's
    // optional requirement box. Form answers remain separate custom fields.
    const writtenBrief=kind==='quote'?sanitize(answeredFields['Additional Requirements']||''):'';
    const requirement=kind==='quote'?writtenBrief:details;
    const fields={
      industryId:flow.industryId,serviceId:flow.serviceId,subserviceId:flow.subserviceId,
      stateId:Number(detected.city.state_id)||null,cityId:Number(detected.city.id),
      customerName:record.customer_name,customerPhone:record.customer_phone,customerEmail:record.customer_email,
      requirement:requirement.slice(0,3900),propertyType:answeredFields['Property Type']||null,
      budget:kind==='quote'?record.budget_text||answeredFields.Budget||null:null,
      source:type(kind).source,
      notes:'Customer contacted the selected professional. Contact access requires an accepted lead.',
      customFields:{
        ...answeredFields,
        _project_origin:{projectId:record.project_id?Number(record.project_id):null,professionalUserId:Number(record.business_user_id),
          businessProfileId:Number(record.business_profile_id),requestId:Number(id),type:kind,
          writtenRequirement:requirement.slice(0,3900)},
        _qualification:{detailedRequirementCompleted:kind==='quote',budgetProvided:Boolean(kind==='quote'&&record.budget_text),
          projectSizeKnown:Boolean(kind==='quote'&&record.area_text)},
      },
      pincode:pin,leadType:'basic',accessStrategy:kind==='profile'?'permanent_single':'shared',buyerCapacity:kind==='profile'?1:3,
      contactConsentAt:new Date(),contactConsentVersion:kind==='profile'?'profile-selected-professional-consent-v1':'project-multi-professional-consent-v1',
      intakeSubmissionKey:'project_'+kind+'_'+id,
      qualityGateContext:kind==='quote'?'project_quote':kind==='profile'?'profile_callback':'project_callback',createdBy:null,
    };
    let leadId,leadStatus='quarantined',duplicate=false;
    try{
      const lead=await leads.createLead(fields);leadId=Number(lead.id);leadStatus=lead.status;
    }catch(error){
      if(error.code!=='DUPLICATE_LEAD'||!error.leadId)throw error;
      leadId=Number(error.leadId);duplicate=true;
    }
    await updateLink(kind,id,{leadId,status:duplicate?'duplicate':'created'});
    return{status:duplicate?'duplicate':'created',leadId,leadStatus,duplicate};
  }catch(error){
    const message=String(error.message||'Unable to add marketplace lead').slice(0,240);
    await updateLink(kind,id,{status:'review_required',error:message});
    if(notify){
      try{
        await notifications.notifyAdmins({
          type:'project_marketplace_review',category:'lead',severity:'warning',
          title:'Marketplace lead needs review',
          message:'Project '+kind+' #'+id+' is saved for the professional, but marketplace creation needs review: '+message,
          actionUrl:'/admin',relatedType:'project_marketplace',relatedId:Number(id),
          dedupeKey:'project-marketplace-review-'+kind+'-'+id,
        });
      }catch(alertError){console.error('Marketplace review alert failed:',alertError.message)}
    }
    return{status:'review_required',reason:error.code||'MARKETPLACE_SYNC_FAILED'};
  }
}
module.exports={sync,flagPending,industry,sanitize};
