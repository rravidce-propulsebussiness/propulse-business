const crypto=require('crypto');
const pool=require('../config/database');
const SECRET=process.env.FLOW_TOKEN_SECRET||process.env.JWT_SECRET||'development-flow-secret-only';
if(process.env.NODE_ENV==='production'&&!process.env.FLOW_TOKEN_SECRET&&!process.env.JWT_SECRET)throw new Error('FLOW_TOKEN_SECRET or JWT_SECRET must be configured in production');
const fail=(message,code,status=400)=>{throw Object.assign(new Error(message),{code,status})};
const id=v=>{if(v===undefined||v===null||v==='')return null;const n=Number(v);return Number.isInteger(n)&&n>0?n:null};
const flowKey=v=>{const k=String(v||'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9-]{1,79}$/.test(k))fail('Flow key must use lowercase letters, numbers and hyphens','INVALID_FLOW_KEY');return k};

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
// Fixed Marketplace request forms load their seeded published definitions. Cache the schema
// briefly; the signed flowToken is time-based, so each response receives a fresh token.
const PUBLISHED_FLOW_TTL_MS=60_000;
const publishedFlowCache=new Map();
async function getPublishedFlow(key){
 const cacheKey=String(key||'');
 const hit=publishedFlowCache.get(cacheKey);
 if(hit&&hit.expiresAt>Date.now())return{...structuredClone(hit.value),flowToken:signFlowToken(hit.value.versionId)};
 const value=await loadPublishedFlow(key);
 const {flowToken,...cacheable}=value;
 publishedFlowCache.set(cacheKey,{value:cacheable,expiresAt:Date.now()+PUBLISHED_FLOW_TTL_MS});
 return value;
}
async function loadPublishedFlow(key){
 const r=(await pool.query(`SELECT d.id definition_id,d.key,d.name,d.flow_type,d.industry_id,d.service_id,d.subservice_id,i.name industry_name,s.name service_name,ss.name subservice_name,v.id version_id,v.version_no,v.config FROM customer_flow_definitions d JOIN industries i ON i.id=d.industry_id AND i.is_active=TRUE LEFT JOIN services s ON s.id=d.service_id AND s.is_active=TRUE LEFT JOIN subservices ss ON ss.id=d.subservice_id AND ss.is_active=TRUE JOIN customer_flow_versions v ON v.definition_id=d.id AND v.status='published' WHERE d.key=$1 AND d.is_active=TRUE AND (d.service_id IS NULL OR s.id IS NOT NULL) AND (d.subservice_id IS NULL OR ss.id IS NOT NULL) AND (v.effective_from IS NULL OR v.effective_from<=CURRENT_TIMESTAMP) LIMIT 1`,[flowKey(key)])).rows[0];if(!r)fail('This customer flow is not available','FLOW_NOT_FOUND',404);
 let qs=(await questions(pool,r.version_id)).filter(q=>q.isActive).map(q=>({...q,options:q.options.filter(o=>o.isActive)}));if(r.key==='property')qs=qs.map(q=>q.questionKey==='property_intent'?{...q,options:q.options.filter(o=>['buy','sell'].includes(String(o.value)))}:q);return{definitionId:r.definition_id,key:r.key,name:r.name,flowType:r.flow_type,industryId:r.industry_id,serviceId:r.service_id,subserviceId:r.subservice_id,industryName:r.industry_name,serviceName:r.service_name,subserviceName:r.subservice_name,versionId:r.version_id,versionNo:r.version_no,config:r.config||{},questions:qs,flowToken:signFlowToken(r.version_id)};
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
 let qs=(await questions(pool,r.version_id)).filter(q=>q.isActive).map(q=>({...q,options:q.options.filter(o=>o.isActive)}));if(r.key==='property')qs=qs.map(q=>q.questionKey==='property_intent'?{...q,options:q.options.filter(o=>['buy','sell'].includes(String(o.value)))}:q);
 return{definitionId:r.definition_id,key:r.key,name:r.name,flowType:r.flow_type,industryId:r.industry_id,serviceId:r.service_id,subserviceId:r.subservice_id,industryName:r.industry_name,serviceName:r.service_name,subserviceName:r.subservice_name,versionId:r.version_id,versionNo:r.version_no,status:r.status,config:r.config||{},questions:qs};
}
module.exports={getPublishedFlow,getVersionFlow,verifyFlowToken};
