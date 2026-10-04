const crypto=require('crypto');
const pool=require('../config/database');
const TYPES=new Set(['single_select','multi_select','text','number','area','budget','timeline','boolean','location']);
const VIS=new Set(['marketplace','protected','internal']);
const LEAD_FIELDS=new Set(['','requirement','property_type','budget']);
const FLOW_TYPES=new Set(['requirement','estimator']);
const SECRET=process.env.FLOW_TOKEN_SECRET||process.env.JWT_SECRET||'development-flow-secret-only';
if(process.env.NODE_ENV==='production'&&!process.env.FLOW_TOKEN_SECRET&&!process.env.JWT_SECRET)throw new Error('FLOW_TOKEN_SECRET or JWT_SECRET must be configured in production');
const fail=(message,code,status=400)=>{throw Object.assign(new Error(message),{code,status})};
const id=v=>{if(v===undefined||v===null||v==='')return null;const n=Number(v);return Number.isInteger(n)&&n>0?n:null};
const flowKey=v=>{const k=String(v||'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9-]{1,79}$/.test(k))fail('Flow key must use lowercase letters, numbers and hyphens','INVALID_FLOW_KEY');return k};

async function validateScope(client,{industryId,serviceId,subserviceId}){
 const industry=id(industryId),service=id(serviceId),subservice=id(subserviceId);if(!industry)fail('Industry is required','INVALID_FLOW_SCOPE');
 if(!(await client.query('SELECT 1 FROM industries WHERE id=$1 AND is_active=TRUE',[industry])).rows.length)fail('Selected industry does not exist','INVALID_FLOW_SCOPE');
 if(service&&!(await client.query('SELECT 1 FROM services WHERE id=$1 AND industry_id=$2 AND is_active=TRUE',[service,industry])).rows.length)fail('Selected service does not belong to the selected industry','INVALID_FLOW_SCOPE');
 if(subservice&&(!service||!(await client.query('SELECT 1 FROM subservices WHERE id=$1 AND service_id=$2 AND is_active=TRUE',[subservice,service])).rows.length))fail('Selected subservice does not belong to the selected service','INVALID_FLOW_SCOPE');
 return{industryId:industry,serviceId:service,subserviceId:subservice};
}
function cleanQuestion(q,n){
 const questionKey=String(q?.questionKey||'').trim().toLowerCase(),questionType=String(q?.questionType||'').trim().toLowerCase(),label=String(q?.label||'').trim(),visibility=String(q?.visibility||'marketplace').trim().toLowerCase(),leadField=String(q?.leadField||'').trim().toLowerCase();
 if(!/^[a-z][a-z0-9_]{1,79}$/.test(questionKey)||!TYPES.has(questionType)||!label||!VIS.has(visibility)||!LEAD_FIELDS.has(leadField))fail(`Question ${n+1} is invalid`,'INVALID_QUESTION');
 const options=(Array.isArray(q?.options)?q.options:[]).map((o,i)=>({value:String(o?.value||'').trim().slice(0,160),label:String(o?.label||'').trim().slice(0,240),displayOrder:Number(o?.displayOrder)||i*10+10,isActive:o?.isActive!==false}));
 if(options.some(o=>!o.value||!o.label)||new Set(options.map(o=>o.value)).size!==options.length)fail(`Question "${label}" has invalid options`,'INVALID_QUESTION');
 if(['single_select','multi_select'].includes(questionType)&&!options.length)fail(`Question "${label}" needs options`,'INVALID_QUESTION');
 return{questionKey,questionType,label:label.slice(0,240),helpText:String(q?.helpText||'').trim().slice(0,2000)||null,isRequired:Boolean(q?.isRequired),displayOrder:Number(q?.displayOrder)||n*10+10,validation:q?.validation&&typeof q.validation==='object'?q.validation:{},showWhen:q?.showWhen&&typeof q.showWhen==='object'?q.showWhen:{},leadField:leadField||null,visibility,isActive:q?.isActive!==false,options};
}
const signature=p=>crypto.createHmac('sha256',SECRET).update(p).digest('base64url');
const signFlowToken=versionId=>{const t=Math.floor(Date.now()/1000),p=`${Number(versionId)}.${t}`;return`${p}.${signature(p)}`};
function verifyFlowToken(token,versionId){
 const p=String(token||'').split('.'),v=Number(p[0]),t=Number(p[1]);if(p.length!==3||v!==Number(versionId)||!Number.isInteger(t)||Math.abs(Math.floor(Date.now()/1000)-t)>7200)fail('This form session expired. Reload the form and try again.','INVALID_FLOW_TOKEN');
 const expected=signature(`${v}.${t}`),a=Buffer.from(p[2]||''),b=Buffer.from(expected);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))fail('This form session is invalid. Reload the form and try again.','INVALID_FLOW_TOKEN');return true;
}
async function questions(client,versionId){
 const qs=(await client.query('SELECT * FROM customer_flow_questions WHERE version_id=$1 ORDER BY display_order,id',[versionId])).rows;if(!qs.length)return[];
 const os=(await client.query('SELECT * FROM customer_flow_question_options WHERE question_id=ANY($1::int[]) ORDER BY question_id,display_order,id',[qs.map(q=>q.id)])).rows,by=new Map();
 for(const o of os){if(!by.has(Number(o.question_id)))by.set(Number(o.question_id),[]);by.get(Number(o.question_id)).push({id:o.id,value:o.value,label:o.label,displayOrder:o.display_order,isActive:o.is_active})}
 return qs.map(q=>({id:q.id,questionKey:q.question_key,questionType:q.question_type,label:q.label,helpText:q.help_text,isRequired:q.is_required,displayOrder:q.display_order,validation:q.validation||{},showWhen:q.show_when||{},leadField:q.lead_field,visibility:q.visibility,isActive:q.is_active,options:by.get(Number(q.id))||[]}));
}
async function listDefinitions(){return(await pool.query(`SELECT d.id,d.key,d.name,d.flow_type,d.industry_id,d.service_id,d.subservice_id,d.is_active,i.name industry_name,s.name service_name,ss.name subservice_name,p.version_no published_version,x.version_no draft_version FROM customer_flow_definitions d JOIN industries i ON i.id=d.industry_id LEFT JOIN services s ON s.id=d.service_id LEFT JOIN subservices ss ON ss.id=d.subservice_id LEFT JOIN LATERAL(SELECT version_no FROM customer_flow_versions WHERE definition_id=d.id AND status='published' LIMIT 1)p ON TRUE LEFT JOIN LATERAL(SELECT version_no FROM customer_flow_versions WHERE definition_id=d.id AND status='draft' ORDER BY version_no DESC LIMIT 1)x ON TRUE ORDER BY d.name`)).rows}
async function getAdminDefinition(flowId){
 const definition=(await pool.query(`SELECT d.*,i.name industry_name,s.name service_name,ss.name subservice_name FROM customer_flow_definitions d JOIN industries i ON i.id=d.industry_id LEFT JOIN services s ON s.id=d.service_id LEFT JOIN subservices ss ON ss.id=d.subservice_id WHERE d.id=$1`,[id(flowId)])).rows[0];if(!definition)fail('Customer flow not found','FLOW_NOT_FOUND',404);
 const versions=(await pool.query('SELECT id,version_no,status,config,effective_from,published_at,created_at,updated_at FROM customer_flow_versions WHERE definition_id=$1 ORDER BY version_no DESC',[definition.id])).rows,editingVersion=versions.find(v=>v.status==='draft')||versions.find(v=>v.status==='published')||null;
 return{...definition,versions,editingVersion:editingVersion?{...editingVersion,questions:await questions(pool,editingVersion.id)}:null};
}
async function createDefinition(data){
 const client=await pool.connect();try{await client.query('BEGIN');const scope=await validateScope(client,data),key=flowKey(data.key),name=String(data.name||'').trim(),flowType=String(data.flowType||'requirement').trim().toLowerCase();if(!name)fail('Flow name is required','INVALID_FLOW_NAME');if(!FLOW_TYPES.has(flowType))fail('Flow type must be requirement or estimator','INVALID_FLOW_TYPE');
 const d=(await client.query(`INSERT INTO customer_flow_definitions(key,name,flow_type,industry_id,service_id,subservice_id,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,[key,name.slice(0,160),flowType,scope.industryId,scope.serviceId,scope.subserviceId,data.createdBy||null])).rows[0];
 await client.query(`INSERT INTO customer_flow_versions(definition_id,version_no,status,config,created_by) VALUES($1,1,'draft','{}'::jsonb,$2)`,[d.id,data.createdBy||null]);await client.query('COMMIT');return getAdminDefinition(d.id);
 }catch(e){await client.query('ROLLBACK').catch(()=>{});if(e.code==='23505')fail('A customer flow with this key already exists','FLOW_KEY_EXISTS',409);throw e}finally{client.release()}
}
async function saveDraft(flowId,data,userId){
 const client=await pool.connect();try{await client.query('BEGIN');const d=(await client.query('SELECT * FROM customer_flow_definitions WHERE id=$1 FOR UPDATE',[id(flowId)])).rows[0];if(!d)fail('Customer flow not found','FLOW_NOT_FOUND',404);
 const scope=await validateScope(client,{industryId:data.industryId??d.industry_id,serviceId:data.serviceId??d.service_id,subserviceId:data.subserviceId??d.subservice_id}),name=String(data.name??d.name).trim();if(!name)fail('Flow name is required','INVALID_FLOW_NAME');
 await client.query('UPDATE customer_flow_definitions SET name=$1,industry_id=$2,service_id=$3,subservice_id=$4,is_active=$5,updated_by=$6,updated_at=CURRENT_TIMESTAMP WHERE id=$7',[name.slice(0,160),scope.industryId,scope.serviceId,scope.subserviceId,data.isActive!==false,userId||null,d.id]);
 let draft=(await client.query(`SELECT * FROM customer_flow_versions WHERE definition_id=$1 AND status='draft' ORDER BY version_no DESC LIMIT 1 FOR UPDATE`,[d.id])).rows[0];
 if(!draft){
   const next=Number((await client.query('SELECT COALESCE(MAX(version_no),0)+1 n FROM customer_flow_versions WHERE definition_id=$1',[d.id])).rows[0].n);
   const source=(await client.query("SELECT id,config FROM customer_flow_versions WHERE definition_id=$1 AND status='published' ORDER BY version_no DESC LIMIT 1",[d.id])).rows[0]||null;
   draft=(await client.query(`INSERT INTO customer_flow_versions(definition_id,version_no,status,config,created_by) VALUES($1,$2,'draft',$3::jsonb,$4) RETURNING *`,[d.id,next,JSON.stringify(data.config||source?.config||{}),userId||null])).rows[0];
   if(d.flow_type==='estimator'&&source){
     await client.query(`INSERT INTO estimator_rate_items(version_id,rate_key,label,calculation_type,unit_question_key,amount_min,amount_max,show_when,display_order,metadata,is_active)
       SELECT $1,rate_key,label,calculation_type,unit_question_key,amount_min,amount_max,show_when,display_order,metadata,is_active FROM estimator_rate_items WHERE version_id=$2`,[draft.id,source.id]);
     await client.query(`INSERT INTO estimator_adjustments(version_id,adjustment_key,label,adjustment_type,value_min,value_max,city_id,show_when,display_order,metadata,is_active)
       SELECT $1,adjustment_key,label,adjustment_type,value_min,value_max,city_id,show_when,display_order,metadata,is_active FROM estimator_adjustments WHERE version_id=$2`,[draft.id,source.id]);
   }
 }else await client.query('UPDATE customer_flow_versions SET config=$1::jsonb,updated_at=CURRENT_TIMESTAMP WHERE id=$2',[JSON.stringify(data.config||draft.config||{}),draft.id]);
 if(!Array.isArray(data.questions)||!data.questions.length)fail('At least one question is required','INVALID_QUESTION');const qs=data.questions.map(cleanQuestion),keys=new Set(qs.map(q=>q.questionKey));if(keys.size!==qs.length)fail('Question keys must be unique','INVALID_QUESTION');
 for(const q of qs){const dep=String(q.showWhen?.questionKey||'').trim();if(dep&&(!keys.has(dep)||dep===q.questionKey))fail(`Question "${q.label}" has an invalid dependency`,'INVALID_DEPENDENCY')}
 await client.query('DELETE FROM customer_flow_questions WHERE version_id=$1',[draft.id]);
 for(const q of qs){const row=(await client.query(`INSERT INTO customer_flow_questions(version_id,question_key,question_type,label,help_text,is_required,display_order,validation,show_when,lead_field,visibility,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12) RETURNING id`,[draft.id,q.questionKey,q.questionType,q.label,q.helpText,q.isRequired,q.displayOrder,JSON.stringify(q.validation),JSON.stringify(q.showWhen),q.leadField,q.visibility,q.isActive])).rows[0];for(const o of q.options)await client.query('INSERT INTO customer_flow_question_options(question_id,value,label,display_order,is_active) VALUES($1,$2,$3,$4,$5)',[row.id,o.value,o.label,o.displayOrder,o.isActive])}
 await client.query('COMMIT');return getAdminDefinition(d.id);
 }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}finally{client.release()}
}
async function publish(flowId,userId){
 const client=await pool.connect();try{await client.query('BEGIN');const d=(await client.query('SELECT id,is_active,flow_type FROM customer_flow_definitions WHERE id=$1 FOR UPDATE',[id(flowId)])).rows[0];if(!d)fail('Customer flow not found','FLOW_NOT_FOUND',404);if(!d.is_active)fail('Activate the flow before publishing it','FLOW_INACTIVE');
 const v=(await client.query(`SELECT * FROM customer_flow_versions WHERE definition_id=$1 AND status='draft' ORDER BY version_no DESC LIMIT 1 FOR UPDATE`,[d.id])).rows[0];if(!v)fail('No draft is available to publish','NO_DRAFT');if(!(await client.query('SELECT 1 FROM customer_flow_questions WHERE version_id=$1 AND is_active=TRUE LIMIT 1',[v.id])).rows.length)fail('Add at least one active question before publishing','EMPTY_FLOW');if(d.flow_type==='estimator'&&!(await client.query('SELECT 1 FROM estimator_rate_items WHERE version_id=$1 AND is_active=TRUE LIMIT 1',[v.id])).rows.length)fail('Configure at least one active estimator rate before publishing','ESTIMATOR_NOT_CONFIGURED');
 await client.query(`UPDATE customer_flow_versions SET status='retired',updated_at=CURRENT_TIMESTAMP WHERE definition_id=$1 AND status='published'`,[d.id]);await client.query(`UPDATE customer_flow_versions SET status='published',published_at=CURRENT_TIMESTAMP,published_by=$1,effective_from=COALESCE(effective_from,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=$2`,[userId||null,v.id]);await client.query('COMMIT');return getAdminDefinition(d.id);
 }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}finally{client.release()}
}
async function setDefinitionStatus(flowId,isActive,userId){const r=await pool.query('UPDATE customer_flow_definitions SET is_active=$1,updated_by=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING id',[Boolean(isActive),userId||null,id(flowId)]);if(!r.rows[0])fail('Customer flow not found','FLOW_NOT_FOUND',404);return getAdminDefinition(r.rows[0].id)}
async function getPublishedFlow(key){
 const r=(await pool.query(`SELECT d.id definition_id,d.key,d.name,d.flow_type,d.industry_id,d.service_id,d.subservice_id,i.name industry_name,s.name service_name,ss.name subservice_name,v.id version_id,v.version_no,v.config FROM customer_flow_definitions d JOIN industries i ON i.id=d.industry_id AND i.is_active=TRUE LEFT JOIN services s ON s.id=d.service_id AND s.is_active=TRUE LEFT JOIN subservices ss ON ss.id=d.subservice_id AND ss.is_active=TRUE JOIN customer_flow_versions v ON v.definition_id=d.id AND v.status='published' WHERE d.key=$1 AND d.is_active=TRUE AND (d.service_id IS NULL OR s.id IS NOT NULL) AND (d.subservice_id IS NULL OR ss.id IS NOT NULL) AND (v.effective_from IS NULL OR v.effective_from<=CURRENT_TIMESTAMP) LIMIT 1`,[flowKey(key)])).rows[0];if(!r)fail('This customer flow is not available','FLOW_NOT_FOUND',404);
 const qs=(await questions(pool,r.version_id)).filter(q=>q.isActive).map(q=>({...q,options:q.options.filter(o=>o.isActive)}));return{definitionId:r.definition_id,key:r.key,name:r.name,flowType:r.flow_type,industryId:r.industry_id,serviceId:r.service_id,subserviceId:r.subservice_id,industryName:r.industry_name,serviceName:r.service_name,subserviceName:r.subservice_name,versionId:r.version_id,versionNo:r.version_no,config:r.config||{},questions:qs,flowToken:signFlowToken(r.version_id)};
}
async function getVersionFlow(versionId){
 const version=id(versionId);if(!version)fail('Customer flow version not found','FLOW_VERSION_NOT_FOUND',404);
 const r=(await pool.query(`SELECT d.id definition_id,d.key,d.name,d.flow_type,d.industry_id,d.service_id,d.subservice_id,i.name industry_name,s.name service_name,ss.name subservice_name,v.id version_id,v.version_no,v.status,v.config
   FROM customer_flow_versions v
   JOIN customer_flow_definitions d ON d.id=v.definition_id AND d.is_active=TRUE
   JOIN industries i ON i.id=d.industry_id AND i.is_active=TRUE
   LEFT JOIN services s ON s.id=d.service_id AND s.is_active=TRUE
   LEFT JOIN subservices ss ON ss.id=d.subservice_id AND ss.is_active=TRUE
   WHERE v.id=$1 AND (d.service_id IS NULL OR s.id IS NOT NULL) AND (d.subservice_id IS NULL OR ss.id IS NOT NULL)
   LIMIT 1`,[version])).rows[0];if(!r)fail('Customer flow version not found','FLOW_VERSION_NOT_FOUND',404);
 const qs=(await questions(pool,r.version_id)).filter(q=>q.isActive).map(q=>({...q,options:q.options.filter(o=>o.isActive)}));
 return{definitionId:r.definition_id,key:r.key,name:r.name,flowType:r.flow_type,industryId:r.industry_id,serviceId:r.service_id,subserviceId:r.subservice_id,industryName:r.industry_name,serviceName:r.service_name,subserviceName:r.subservice_name,versionId:r.version_id,versionNo:r.version_no,status:r.status,config:r.config||{},questions:qs};
}
module.exports={listDefinitions,getAdminDefinition,createDefinition,saveDraft,publish,setDefinitionStatus,getPublishedFlow,getVersionFlow,verifyFlowToken};
