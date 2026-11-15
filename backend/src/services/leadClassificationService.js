const pool=require('../config/database');

const DEFAULT_CONDITIONS=[
  {field:'Plot Size',operator:'gt',value:'150',fieldType:'number'},
  {field:'Floors',operator:'gt',value:'G+3',fieldType:'floors'}
];
const OPERATORS=new Set(['gt','gte','lt','lte','eq','contains','not_contains']);
const clean=value=>String(value??'').trim();
const normalizeKey=value=>clean(value).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
function numericValue(value,fieldType='number'){
  const text=clean(value).replace(/,/g,'');
  if(!text)return null;
  if(fieldType==='floors'){
    const groundPlus=text.match(/^\s*(?:g|ground(?:\s*floor)?)\s*\+\s*(\d+(?:\.\d+)?)/i);
    if(groundPlus)return Number(groundPlus[1])+1;
  }
  const match=text.match(/-?\d+(?:\.\d+)?/);
  return match?Number(match[0]):null;
}
function normalizeCondition(condition={}){
  const field=clean(condition.field).slice(0,120);
  const operator=OPERATORS.has(clean(condition.operator))?clean(condition.operator):'gt';
  const requestedType=clean(condition.fieldType);
  const fieldType=['floors','text'].includes(requestedType)?requestedType:'number';
  const value=clean(condition.value).slice(0,60);
  if(!field)throw Object.assign(new Error('Enter the form question name for every Premium condition'),{code:'INVALID_LEAD_CLASSIFICATION_SETTINGS'});
  if(!value)throw Object.assign(new Error('Enter a value for every Premium condition'),{code:'INVALID_LEAD_CLASSIFICATION_SETTINGS'});
  if(fieldType==='text'){
    if(!['eq','contains','not_contains'].includes(operator))throw Object.assign(new Error('Text conditions support equals, contains, or does not contain'),{code:'INVALID_LEAD_CLASSIFICATION_SETTINGS'});
  }else if(numericValue(value,fieldType)===null){
    throw Object.assign(new Error('Enter a numeric threshold; floors also accepts values such as G+3'),{code:'INVALID_LEAD_CLASSIFICATION_SETTINGS'});
  }
  return{field,operator,value,fieldType};
}
function normalizeSettings(row={}){
  let conditions=row.premium_conditions??row.premiumConditions??DEFAULT_CONDITIONS;
  if(typeof conditions==='string'){try{conditions=JSON.parse(conditions)}catch{conditions=DEFAULT_CONDITIONS}}
  if(!Array.isArray(conditions))conditions=DEFAULT_CONDITIONS;
  return{
    enabled:row.enabled===undefined?true:Boolean(row.enabled),
    matchMode:['all','any'].includes(clean(row.match_mode??row.matchMode))?clean(row.match_mode??row.matchMode):'all',
    premiumConditions:conditions.slice(0,12).map(normalizeCondition),
    updatedAt:row.updated_at||null
  };
}
async function getSettings(client=pool){
  const [globalResult,industryResult]=await Promise.all([
    client.query('SELECT * FROM lead_classification_settings WHERE id=1'),
    client.query('SELECT * FROM lead_classification_industry_settings ORDER BY industry_id')
  ]);
  const settings=normalizeSettings(globalResult.rows[0]||{});
  settings.industryRules=Object.fromEntries(industryResult.rows.map(row=>[String(row.industry_id),normalizeSettings(row)]));
  return settings;
}
async function updateSettings(data={},adminUserId){
  const industryId=data.industryId===null||data.industryId===undefined||data.industryId===''?null:Number(data.industryId);
  if(industryId!==null&&(!Number.isInteger(industryId)||industryId<1))throw Object.assign(new Error('Choose a valid industry for these Premium rules'),{code:'INVALID_LEAD_CLASSIFICATION_SETTINGS'});
  if(industryId!==null){
    const current=(await pool.query('SELECT * FROM lead_classification_industry_settings WHERE industry_id=$1',[industryId])).rows[0];
    const inherited=current?normalizeSettings(current):await getGlobalSettings();
    const settings=normalizeSettings({
      enabled:data.enabled===undefined?inherited.enabled:Boolean(data.enabled),
      matchMode:data.matchMode??inherited.matchMode,
      premiumConditions:data.premiumConditions??inherited.premiumConditions
    });
    await pool.query(
      `INSERT INTO lead_classification_industry_settings(industry_id,enabled,match_mode,premium_conditions,updated_by,updated_at)
       VALUES($1,$2,$3,$4::jsonb,$5,CURRENT_TIMESTAMP)
       ON CONFLICT(industry_id) DO UPDATE SET enabled=EXCLUDED.enabled,match_mode=EXCLUDED.match_mode,
         premium_conditions=EXCLUDED.premium_conditions,updated_by=EXCLUDED.updated_by,updated_at=CURRENT_TIMESTAMP`,
      [industryId,settings.enabled,settings.matchMode,JSON.stringify(settings.premiumConditions),adminUserId||null]
    );
    return getSettings();
  }
  const current=await getGlobalSettings();
  const settings=normalizeSettings({
    enabled:data.enabled===undefined?current.enabled:Boolean(data.enabled),
    matchMode:data.matchMode??current.matchMode,
    premiumConditions:data.premiumConditions??current.premiumConditions
  });
  await pool.query(
    `INSERT INTO lead_classification_settings(id,enabled,match_mode,premium_conditions,updated_by,updated_at)
     VALUES(1,$1,$2,$3::jsonb,$4,CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET enabled=EXCLUDED.enabled,match_mode=EXCLUDED.match_mode,
       premium_conditions=EXCLUDED.premium_conditions,updated_by=EXCLUDED.updated_by,updated_at=CURRENT_TIMESTAMP`,
    [settings.enabled,settings.matchMode,JSON.stringify(settings.premiumConditions),adminUserId||null]
  );
  return getSettings();
}
async function getGlobalSettings(client=pool){
  const row=(await client.query('SELECT * FROM lead_classification_settings WHERE id=1')).rows[0];
  return normalizeSettings(row||{});
}
function fieldAnswer(custom={},field){
  if(!custom||typeof custom!=='object'||Array.isArray(custom))return'';
  const target=normalizeKey(field);if(!target)return'';
  const entries=Object.entries(custom).filter(([,value])=>value!==null&&value!==undefined&&clean(value)!=='');
  const exact=entries.find(([key])=>normalizeKey(key)===target);
  if(exact)return exact[1];
  const related=entries.find(([key])=>{const actual=normalizeKey(key);return actual.includes(target)||target.includes(actual)});
  return related?related[1]:'';
}
function matchesCondition(custom,condition){
  const answer=fieldAnswer(custom,condition.field);
  if(condition.fieldType==='text'){
    const left=normalizeKey(answer),right=normalizeKey(condition.value);
    if(!left||!right)return false;
    if(condition.operator==='contains')return left.includes(right);
    if(condition.operator==='not_contains')return !left.includes(right);
    return left===right;
  }
  const left=numericValue(answer,condition.fieldType),right=numericValue(condition.value,condition.fieldType);
  if(left===null||right===null)return false;
  switch(condition.operator){
    case'gte':return left>=right;
    case'lt':return left<right;
    case'lte':return left<=right;
    case'eq':return left===right;
    default:return left>right;
  }
}
function classify(custom,settings,industryId=null){
  const scoped=settings?.industryRules?.[String(industryId)]||settings;
  if(!scoped||scoped.enabled!==true)return null;
  const conditions=Array.isArray(scoped.premiumConditions)?scoped.premiumConditions:[];
  if(!conditions.length)return'basic';
  const result=scoped.matchMode==='any'?conditions.some(condition=>matchesCondition(custom,condition)):conditions.every(condition=>matchesCondition(custom,condition));
  return result?'premium':'basic';
}
module.exports={getSettings,updateSettings,classify,normalizeSettings,numericValue,matchesCondition};
