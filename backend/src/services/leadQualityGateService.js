const pool=require('../config/database');
const leadQualityService=require('./leadQualityService');
const criticalActionAudit=require('./criticalActionAuditService');
const notificationService=require('./notificationService');

const humanize=flag=>({
  score_below_threshold:'Quality score is below the configured release threshold',
  missing_contact:'Customer phone/email is missing',
  invalid_contact:'Customer phone/email is not valid',
  invalid_pincode:'PIN code is not a valid 6-digit Indian PIN',
  pincode_city_mismatch:'PIN code is not mapped to the selected City',
  classification_mismatch:'Industry / Service / Subservice hierarchy is inconsistent'
}[flag]||String(flag||'').replace(/_/g,' '));

function normalizeSettings(row={}){
  return{
    enabled:row.enabled!==false,
    minimumScore:Number(row.minimum_score??70),
    requireContact:row.require_contact!==false,
    requireValidContact:row.require_valid_contact!==false,
    requireValidPincode:row.require_valid_pincode!==false,
    requirePincodeCityMatch:row.require_pincode_city_match!==false,
    requireClassificationValid:row.require_classification_valid!==false,
    updatedAt:row.updated_at||null
  };
}
async function getSettings(client=pool){
  const row=(await client.query('SELECT * FROM lead_quality_gate_settings WHERE id=1')).rows[0]||{};
  return normalizeSettings(row);
}
async function updateSettings(data={},adminUserId,client=pool){
  if(client===pool){
    const tx=await pool.connect();
    try{await tx.query('BEGIN');const result=await updateSettings(data,adminUserId,tx);await tx.query('COMMIT');return result}
    catch(error){await tx.query('ROLLBACK');throw error}finally{tx.release()}
  }
  const current=await getSettings(client);
  const minimumScore=Number(data.minimumScore??current.minimumScore);
  if(!Number.isFinite(minimumScore)||minimumScore<0||minimumScore>100){
    const error=new Error('Minimum quality score must be between 0 and 100');
    error.code='INVALID_QUALITY_GATE_SETTINGS';
    throw error;
  }
  const values={
    enabled:data.enabled===undefined?current.enabled:Boolean(data.enabled),
    minimumScore:Number(minimumScore.toFixed(2)),
    requireContact:data.requireContact===undefined?current.requireContact:Boolean(data.requireContact),
    requireValidContact:data.requireValidContact===undefined?current.requireValidContact:Boolean(data.requireValidContact),
    requireValidPincode:data.requireValidPincode===undefined?current.requireValidPincode:Boolean(data.requireValidPincode),
    requirePincodeCityMatch:data.requirePincodeCityMatch===undefined?current.requirePincodeCityMatch:Boolean(data.requirePincodeCityMatch),
    requireClassificationValid:data.requireClassificationValid===undefined?current.requireClassificationValid:Boolean(data.requireClassificationValid)
  };
  const row=(await client.query(
    `INSERT INTO lead_quality_gate_settings(
       id,enabled,minimum_score,require_contact,require_valid_contact,require_valid_pincode,
       require_pincode_city_match,require_classification_valid,updated_by,updated_at
     ) VALUES(1,$1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       enabled=EXCLUDED.enabled,minimum_score=EXCLUDED.minimum_score,require_contact=EXCLUDED.require_contact,
       require_valid_contact=EXCLUDED.require_valid_contact,require_valid_pincode=EXCLUDED.require_valid_pincode,
       require_pincode_city_match=EXCLUDED.require_pincode_city_match,
       require_classification_valid=EXCLUDED.require_classification_valid,updated_by=EXCLUDED.updated_by,updated_at=CURRENT_TIMESTAMP
     RETURNING *`,
    [values.enabled,values.minimumScore,values.requireContact,values.requireValidContact,values.requireValidPincode,
      values.requirePincodeCityMatch,values.requireClassificationValid,adminUserId||null]
  )).rows[0];
  const after=normalizeSettings(row);
  await criticalActionAudit.record(client,{actorId:adminUserId,category:'lead',action:'lead.quality_gate_settings',entityType:'lead_quality_gate_settings',entityId:1,beforeData:current,afterData:after,source:'lead_quality_gate'});
  return after;
}

async function getFeatureRow(leadId,client=pool){
  const id=Number(leadId);
  if(!Number.isInteger(id)||id<=0)throw Object.assign(new Error('Invalid Lead ID'),{code:'LEAD_NOT_FOUND'});
  const row=(await client.query(
    `WITH target AS (
       SELECT l.*,
              regexp_replace(COALESCE(l.customer_phone,''),'[^0-9]','','g') AS phone_key,
              LOWER(TRIM(COALESCE(l.customer_email,''))) AS email_key,
              CASE WHEN NULLIF(LOWER(TRIM(COALESCE(l.customer_name,''))),'') IS NOT NULL
                     AND NULLIF(LOWER(TRIM(COALESCE(l.requirement,''))),'') IS NOT NULL
                   THEN md5(LOWER(TRIM(l.customer_name)) || '|' || LOWER(TRIM(l.requirement)))
                   ELSE '' END AS identity_key
       FROM leads l WHERE l.id=$1
     )
     SELECT t.id,t.status,t.customer_name,t.customer_phone,t.customer_email,t.requirement,t.industry_id,t.service_id,t.subservice_id,
            t.state_id,t.city_id,t.pincode,t.property_type,t.budget,t.custom_fields,t.phone_key,t.email_key,t.identity_key,
            NULLIF(TRIM(COALESCE(t.customer_name,'')),'') IS NOT NULL AS has_name,
            (NULLIF(TRIM(COALESCE(t.customer_phone,'')),'') IS NOT NULL OR NULLIF(TRIM(COALESCE(t.customer_email,'')),'') IS NOT NULL) AS has_contact,
            (NULLIF(TRIM(COALESCE(t.requirement,'')),'') IS NOT NULL
              OR (t.source='public_requirement'
                AND jsonb_typeof(t.custom_fields->'_qualification'->'marketplaceAnswers')='object'
                AND t.custom_fields->'_qualification'->'marketplaceAnswers'<>'{}'::jsonb)) AS has_requirement,
            t.industry_id IS NOT NULL AS has_industry,
            (t.service_id IS NOT NULL OR t.subservice_id IS NOT NULL) AS has_service_detail,
            t.state_id IS NOT NULL AS has_state,
            t.city_id IS NOT NULL AS has_city,
            NULLIF(TRIM(COALESCE(t.pincode,'')),'') IS NOT NULL AS has_pincode,
            (NULLIF(TRIM(COALESCE(t.property_type,'')),'') IS NOT NULL OR NULLIF(TRIM(COALESCE(t.budget::text,'')),'') IS NOT NULL OR COALESCE(t.custom_fields,'{}'::jsonb)<>'{}'::jsonb) AS has_project_detail,
            (char_length(t.phone_key) BETWEEN 10 AND 13 OR LOWER(TRIM(COALESCE(t.customer_email,''))) ~ '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$') AS valid_contact,
            COALESCE(t.pincode,'') ~ '^[0-9]{6}$' AS valid_pincode,
            EXISTS(SELECT 1 FROM city_pincodes cp WHERE cp.pincode=t.pincode AND cp.city_id=t.city_id AND cp.is_active=TRUE) AS pincode_city_mapped,
            (t.industry_id IS NOT NULL
              AND (t.service_id IS NULL OR s.industry_id=t.industry_id)
              AND (t.subservice_id IS NULL OR (t.service_id IS NOT NULL AND ss.service_id=t.service_id))) AS classification_valid,
            (t.phone_key='' OR NOT EXISTS(
              SELECT 1 FROM leads x WHERE x.id<>t.id AND regexp_replace(COALESCE(x.customer_phone,''),'[^0-9]','','g')=t.phone_key
            )) AS unique_phone,
            (t.email_key='' OR NOT EXISTS(
              SELECT 1 FROM leads x WHERE x.id<>t.id AND LOWER(TRIM(COALESCE(x.customer_email,'')))=t.email_key
            )) AS unique_email,
            (t.identity_key='' OR NOT EXISTS(
              SELECT 1 FROM leads x WHERE x.id<>t.id
                AND md5(LOWER(TRIM(COALESCE(x.customer_name,''))) || '|' || LOWER(TRIM(COALESCE(x.requirement,''))))=t.identity_key
            )) AS unique_identity,
            EXISTS(SELECT 1 FROM lead_reports r WHERE r.lead_id=t.id AND r.status='verified_fake') AS verified_fake,
            EXISTS(SELECT 1 FROM lead_reports r WHERE r.lead_id=t.id AND r.status='verified_genuine') AS verified_genuine,
            EXISTS(SELECT 1 FROM lead_purchases p WHERE p.lead_id=t.id AND p.status IN ('paid','refunded')) AS purchased
       FROM target t
       LEFT JOIN services s ON s.id=t.service_id
       LEFT JOIN subservices ss ON ss.id=t.subservice_id`,
    [id]
  )).rows[0];
  if(!row)throw Object.assign(new Error('Lead not found'),{code:'LEAD_NOT_FOUND'});
  return row;
}

function decide(feature,settings){
  const quality=leadQualityService.scoreLeadFeature(feature);
  const flags=[];
  if(settings.enabled){
    if(quality.score<settings.minimumScore)flags.push('score_below_threshold');
    if(settings.requireContact&&!feature.has_contact)flags.push('missing_contact');
    if(settings.requireValidContact&&feature.has_contact&&!feature.valid_contact)flags.push('invalid_contact');
    if(settings.requireValidPincode&&!feature.valid_pincode)flags.push('invalid_pincode');
    if(settings.requirePincodeCityMatch&&feature.valid_pincode&&(!feature.has_city||!feature.pincode_city_mapped))flags.push('pincode_city_mismatch');
    if(settings.requireClassificationValid&&!feature.classification_valid)flags.push('classification_mismatch');
  }
  const unique=[...new Set(flags)];
  return{
    score:quality.score,
    band:quality.band,
    breakdown:quality.breakdown,
    qualityFlags:quality.flags,
    gateFlags:unique,
    reasons:unique.map(flag=>({code:flag,message:humanize(flag)})),
    shouldQuarantine:settings.enabled&&unique.length>0
  };
}

async function evaluateLead(leadId,client=pool){
  const [settings,feature]=await Promise.all([getSettings(client),getFeatureRow(leadId,client)]);
  return{settings,feature,evaluation:decide(feature,settings)};
}
async function evaluateAndApply(leadId,{context='system',autoRelease=true,reviewedBy=null,reviewNote=null}={},client=pool){
  if(reviewedBy&&client===pool){
    const tx=await pool.connect();
    try{await tx.query('BEGIN');const result=await evaluateAndApply(leadId,{context,autoRelease,reviewedBy,reviewNote},tx);await tx.query('COMMIT');return result}
    catch(error){await tx.query('ROLLBACK');throw error}finally{tx.release()}
  }
  const {settings,evaluation}=await evaluateLead(leadId,client);
  const current=(await client.query('SELECT id,status,created_by,lead_partner_id FROM leads WHERE id=$1',[Number(leadId)])).rows[0];
  if(!current)throw Object.assign(new Error('Lead not found'),{code:'LEAD_NOT_FOUND'});
  let nextStatus=current.status;
  if(evaluation.shouldQuarantine&&['available','paused','quarantined'].includes(current.status))nextStatus='quarantined';
  else if(!evaluation.shouldQuarantine&&autoRelease&&current.status==='quarantined')nextStatus='available';
  const gateStatus=evaluation.shouldQuarantine?'quarantined':'passed';
  const reviewer=reviewedBy?Number(reviewedBy):null;
  const lead=(await client.query(
    `UPDATE leads SET
       status=$1,quality_gate_score=$2,quality_gate_status=$3,quality_gate_reasons=$4::jsonb,
       quality_gate_checked_at=CURRENT_TIMESTAMP,quality_gate_context=$5,
       quality_gate_reviewed_by=CASE WHEN $6::int IS NOT NULL THEN $6 ELSE quality_gate_reviewed_by END,
       quality_gate_reviewed_at=CASE WHEN $6::int IS NOT NULL THEN CURRENT_TIMESTAMP ELSE quality_gate_reviewed_at END,
       quality_gate_note=CASE WHEN $6::int IS NOT NULL THEN NULLIF($7,'') ELSE quality_gate_note END,
       updated_at=CURRENT_TIMESTAMP
     WHERE id=$8 RETURNING *`,
    [nextStatus,evaluation.score,gateStatus,JSON.stringify(evaluation.reasons),String(context||'system').slice(0,32),reviewer,String(reviewNote||'').trim().slice(0,1000),Number(leadId)]
  )).rows[0];
  if(reviewer){
    await criticalActionAudit.record(client,{actorId:reviewer,category:'lead',action:'lead.quality_recheck',entityType:'lead',entityId:leadId,beforeData:{status:current.status},afterData:{status:lead.status,qualityGateStatus:lead.quality_gate_status,qualityScore:lead.quality_gate_score},reason:reviewNote,metadata:{context,evaluationScore:evaluation.score,gateFlags:evaluation.gateFlags},source:'lead_quality_gate'});
  }
  const fingerprint=[Number(evaluation.score||0).toFixed(1),...(evaluation.gateFlags||[]).slice().sort()].join(':');
  if(lead.status==='quarantined'){
    const payload={
      type:'lead_quality_hold',category:'lead',severity:'warning',title:'Lead held for quality review',
      message:`Lead #${leadId} is quarantined at ${Number(evaluation.score||0).toFixed(1)}/100. ${evaluation.reasons?.[0]?.message||'Review the lead quality checks.'}`,
      relatedType:'lead',relatedId:leadId,dedupeKey:`lead-quality-hold:${leadId}:${fingerprint}`,
      metadata:{qualityScore:Number(evaluation.score||0),gateFlags:evaluation.gateFlags||[]},
      email:false
    };
    if(current.lead_partner_id&&current.created_by){
      await notificationService.notifyUser({...payload,userId:current.created_by,actionUrl:'/lead-partner/inventory'},client);
    }else{
      await notificationService.notifyAdmins({...payload,actionUrl:'/admin/leads',email:false},client);
    }
  }else if(current.status==='quarantined'&&lead.status==='available'&&current.lead_partner_id&&current.created_by){
    await notificationService.notifyUser({
      userId:current.created_by,type:'lead_quality_released',category:'lead',severity:'success',
      title:'Lead released from quality hold',message:`Lead #${leadId} passed review and is available in inventory.`,
      actionUrl:'/lead-partner/inventory',relatedType:'lead',relatedId:leadId,
      dedupeKey:`lead-quality-released:${leadId}:${Number(evaluation.score||0).toFixed(1)}`,
      metadata:{qualityScore:Number(evaluation.score||0)},
      email:false
    },client);
  }
  return{lead,settings,evaluation};
}
async function overrideQuarantine({leadId,adminUserId,note=''}) {
  const id=Number(leadId),client=await pool.connect();
  try{
    await client.query('BEGIN');
    const before=(await client.query('SELECT id,status,quality_gate_status,quality_gate_score,quality_gate_reasons,created_by,lead_partner_id FROM leads WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!before)throw Object.assign(new Error('Lead is not eligible for quarantine override'),{code:'QUALITY_OVERRIDE_NOT_ALLOWED'});
    const row=(await client.query(
      `UPDATE leads SET status='available',quality_gate_status='overridden',
         quality_gate_reviewed_by=$2,quality_gate_reviewed_at=CURRENT_TIMESTAMP,quality_gate_note=$3,updated_at=CURRENT_TIMESTAMP
       WHERE id=$1 AND status='quarantined'
         AND NOT EXISTS(SELECT 1 FROM lead_purchases p WHERE p.lead_id=leads.id AND p.status IN ('paid','pending_payment'))
       RETURNING *`,
      [id,adminUserId||null,String(note||'').trim().slice(0,1000)||null]
    )).rows[0];
    if(!row)throw Object.assign(new Error('Lead is not eligible for quarantine override'),{code:'QUALITY_OVERRIDE_NOT_ALLOWED'});
    await criticalActionAudit.record(client,{actorId:adminUserId,category:'lead',action:'lead.quarantine_override',entityType:'lead',entityId:id,beforeData:before,afterData:{status:row.status,qualityGateStatus:row.quality_gate_status,qualityScore:row.quality_gate_score},reason:note,source:'lead_quality_gate'});
    if(before.lead_partner_id&&before.created_by){
      await notificationService.notifyUser({
        userId:before.created_by,type:'lead_quality_released',category:'lead',severity:'success',
        title:'Lead released from quality hold',message:`Lead #${id} was reviewed by ProPulse and released to inventory.`,
        actionUrl:'/lead-partner/inventory',relatedType:'lead',relatedId:id,
        dedupeKey:`lead-quality-override:${id}:${row.quality_gate_reviewed_at||Date.now()}`,
        metadata:{qualityScore:Number(row.quality_gate_score||0),override:true}
      },client);
    }
    await client.query('COMMIT');
    return row;
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}

module.exports={getSettings,updateSettings,getFeatureRow,decide,evaluateLead,evaluateAndApply,overrideQuarantine};
