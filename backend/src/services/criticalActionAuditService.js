const pool=require('../config/database');

const CATEGORIES=new Set(['account','payment','membership','lead','pricing','payout','security','system']);
const SECRET_KEY=/(password|password_hash|token|secret|cookie|authorization|proof_url|proof_data|account_number|manual_reference|transfer_reference|credential)/i;
const MASK_KEY=/(phone|email|upi_id)/i;

function maskValue(key,value){
  if(value===null||value===undefined)return value;
  const text=String(value);
  if(/email/i.test(key)){
    const [local,domain]=text.split('@');
    return domain?(local?.slice(0,1)||'*')+'***@'+domain:text.slice(0,2)+'***';
  }
  if(/phone/i.test(key))return text.length>4?'••••'+text.slice(-4):'••••';
  if(/upi_id/i.test(key))return text.replace(/^(.{1,2}).*(@.*)$/,'$1***$2');
  return text;
}
function sanitize(value,depth=0){
  if(value===null||value===undefined)return value;
  if(depth>5)return '[max-depth]';
  if(value instanceof Date)return Number.isFinite(value.getTime())?value.toISOString():null;
  if(typeof value==='bigint')return value.toString();
  if(Array.isArray(value))return value.slice(0,100).map(item=>sanitize(item,depth+1));
  if(typeof value==='object'){
    const out={};
    for(const [key,val] of Object.entries(value)){
      if(SECRET_KEY.test(key)){out[key]='[redacted]';continue}
      if(MASK_KEY.test(key)){out[key]=maskValue(key,val);continue}
      out[key]=sanitize(val,depth+1);
    }
    return out;
  }
  if(typeof value==='string')return value.length>2000?value.slice(0,2000)+'…':value;
  if(['number','boolean'].includes(typeof value))return value;
  return String(value);
}
function cleanReason(value){
  const text=String(value||'').trim();
  return text?text.slice(0,2000):null;
}
function requestIdFrom(context={}){
  return String(context.requestId||context.request_id||'').trim().slice(0,160)||null;
}
function valuesEqual(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function summarizeChanges(beforeData,afterData){
  const before=sanitize(beforeData)||{},after=sanitize(afterData)||{};
  if(!beforeData&&!afterData)return[];
  const keys=[...new Set([...Object.keys(before||{}),...Object.keys(after||{})])].slice(0,60);
  return keys.filter(key=>!valuesEqual(before?.[key],after?.[key])).map(key=>({field:key,before:before?.[key]??null,after:after?.[key]??null}));
}

async function record(clientOrPool=pool,{
  actorId=null,category='system',action,entityType,entityId=null,beforeData=null,afterData=null,
  reason=null,metadata={},source='application',requestContext={}
}={}){
  if(!action||!entityType)return null;
  const db=clientOrPool||pool;
  const safeCategory=CATEGORIES.has(String(category))?String(category):'system';
  const safeBefore=beforeData===null||beforeData===undefined?null:sanitize(beforeData);
  const safeAfter=afterData===null||afterData===undefined?null:sanitize(afterData);
  const safeMetadata={...sanitize(metadata||{}),changes:summarizeChanges(beforeData,afterData)};
  return (await db.query(
    `INSERT INTO critical_action_audit(
       actor_user_id,category,action,entity_type,entity_id,source,request_id,before_data,after_data,reason,metadata
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11::jsonb)
     RETURNING *`,
    [
      actorId?Number(actorId):null,safeCategory,String(action).slice(0,100),String(entityType).slice(0,60),
      entityId===null||entityId===undefined?null:String(entityId).slice(0,120),String(source||'application').slice(0,80),
      requestIdFrom(requestContext),
      safeBefore===null?null:JSON.stringify(safeBefore),safeAfter===null?null:JSON.stringify(safeAfter),
      cleanReason(reason),JSON.stringify(safeMetadata)
    ]
  )).rows[0];
}

async function list({category='all',action='all',actorId,entityType='all',search='',from,to,page=1,limit=50}={}){
  const values=[],where=[];
  if(category&&category!=='all'){values.push(String(category));where.push(`a.category=$${values.length}`)}
  if(action&&action!=='all'){values.push(String(action));where.push(`a.action=$${values.length}`)}
  if(entityType&&entityType!=='all'){values.push(String(entityType));where.push(`a.entity_type=$${values.length}`)}
  if(actorId!==undefined&&actorId!==null&&actorId!==''){values.push(Number(actorId));where.push(`a.actor_user_id=$${values.length}`)}
  if(from){values.push(new Date(from));where.push(`a.created_at>=$${values.length}`)}
  if(to){values.push(new Date(to));where.push(`a.created_at<=$${values.length}`)}
  const q=String(search||'').trim();
  if(q){
    values.push('%'+q+'%');
    where.push(`(a.action ILIKE $${values.length} OR a.entity_type ILIKE $${values.length} OR COALESCE(a.entity_id,'') ILIKE $${values.length}
      OR COALESCE(a.reason,'') ILIKE $${values.length} OR COALESCE(u.name,'') ILIKE $${values.length} OR COALESCE(u.email,'') ILIKE $${values.length})`);
  }
  const safePage=Math.max(1,Number(page)||1),safeLimit=Math.min(100,Math.max(1,Number(limit)||50)),offset=(safePage-1)*safeLimit;
  const base=where.length?'WHERE '+where.join(' AND '):'';
  const fromSql='critical_action_audit a LEFT JOIN users u ON u.id=a.actor_user_id';
  const [count,stats,actions,entities]=await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM ${fromSql} ${base}`,values),
    pool.query(`SELECT COUNT(*)::int AS total,
       COUNT(*) FILTER(WHERE created_at>=CURRENT_DATE)::int AS today,
       COUNT(*) FILTER(WHERE category IN ('payment','payout'))::int AS financial,
       COUNT(*) FILTER(WHERE category IN ('account','membership','security'))::int AS access_security,
       COUNT(*) FILTER(WHERE category IN ('lead','pricing'))::int AS lead_pricing
       FROM critical_action_audit`),
    pool.query(`SELECT action,category,COUNT(*)::int AS total FROM critical_action_audit GROUP BY action,category ORDER BY category,action`),
    pool.query(`SELECT entity_type,COUNT(*)::int AS total FROM critical_action_audit GROUP BY entity_type ORDER BY entity_type`)
  ]);
  const dataValues=[...values,safeLimit,offset];
  const items=(await pool.query(
    `SELECT a.*,u.name AS actor_name,u.email AS actor_email
       FROM ${fromSql} ${base}
       ORDER BY a.created_at DESC,a.id DESC
       LIMIT $${dataValues.length-1} OFFSET $${dataValues.length}`,
    dataValues
  )).rows;
  const total=Number(count.rows[0]?.total||0);
  return{items,total,page:safePage,limit:safeLimit,pages:Math.ceil(total/safeLimit),stats:stats.rows[0]||{},actions:actions.rows,entities:entities.rows};
}

module.exports={sanitize,summarizeChanges,record,list,CATEGORIES};
