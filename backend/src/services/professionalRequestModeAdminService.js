const pool=require('../config/database');
const audit=require('./criticalActionAuditService');
const policy=require('./professionalRequestPolicy');

const TYPES={
  quote:{table:'professional_project_quote_requests',source:'professional_project_quote',project:'IS NOT NULL'},
  callback:{table:'project_callback_requests',source:'professional_project_callback',project:'IS NOT NULL'},
  profile:{table:'project_callback_requests',source:'professional_profile_callback',project:'IS NULL'},
};
function error(message,code){return Object.assign(new Error(message),{code});}
async function updateMode({kind,requestId,accessMode,adminId}={}){
  const t=TYPES[kind],id=Number(requestId),actor=Number(adminId);
  if(!t||!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(actor)||actor<1)
    throw error('Invalid professional enquiry or Admin','INVALID_ACCESS_REQUEST');
  if(!Object.hasOwn(policy.MODES,accessMode))
    throw error('Select one of the available access modes','INVALID_ACCESS_MODE');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const old=(await client.query(
      'SELECT id,business_user_id,marketplace_lead_id,access_mode FROM '+t.table+
        ' WHERE id=$1 AND project_id '+t.project+' FOR UPDATE',[id]
    )).rows[0];
    if(!old)throw error('Enquiry not found','ACCESS_REQUEST_NOT_FOUND');
    const leadId=Number(old.marketplace_lead_id);
    if(Number.isSafeInteger(leadId)&&leadId>0){
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['lead-capacity:'+leadId]);
      const lead=(await client.query('SELECT source,custom_fields FROM leads WHERE id=$1 FOR UPDATE',[leadId])).rows[0];
      const origin=lead?.custom_fields?._project_origin;
      if(!lead||lead.source!==t.source||origin?.type!==kind||
         Number(origin?.requestId)!==id||Number(origin?.professionalUserId)!==Number(old.business_user_id))
        throw error('Linked marketplace lead failed ownership validation','ACCESS_LINK_INVALID');
      const occupied=(await client.query(`
        SELECT
          EXISTS(SELECT 1 FROM lead_purchases WHERE lead_id=$1) AS purchased,
          EXISTS(SELECT 1 FROM lead_entitlement_claims WHERE lead_id=$1) AS claimed
      `,[leadId])).rows[0];
      if(occupied.purchased||occupied.claimed)
        throw error('Cannot change the access mode after payment or free acceptance has started','ACCESS_MODE_LOCKED');
      await client.query(`
        UPDATE leads SET custom_fields=jsonb_set(COALESCE(custom_fields,'{}'::jsonb),
          '{_professional_access_mode}',to_jsonb($2::text),true),updated_at=CURRENT_TIMESTAMP
        WHERE id=$1`,[leadId,accessMode]);
    }
    await client.query('UPDATE '+t.table+' SET access_mode=$2 WHERE id=$1',[id,accessMode]);
    await audit.record(client,{
      actorId:actor,category:'lead',action:'lead.professional_access_mode_changed',
      entityType:t.table,entityId:id,
      beforeData:{accessMode:old.access_mode,leadId:Number.isSafeInteger(leadId)?leadId:null},
      afterData:{accessMode,leadId:Number.isSafeInteger(leadId)?leadId:null},
      reason:'Admin configured professional enquiry access',
      source:'admin_professional_enquiries'
    });
    await client.query('COMMIT');
    return{requestId:id,kind,accessMode};
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}
  finally{client.release()}
}
module.exports={updateMode,TYPES};
