const pool=require('../config/database');

const DEFAULT_CONDITIONS=[
  {field:'Plot Size',operator:'gt',value:'150',fieldType:'number'},
  {field:'Floors',operator:'gt',value:'G+3',fieldType:'floors'}
];
const OPERATORS=new Set(['gt','gte','lt','lte','eq']);
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
  const fieldType=clean(condition.fieldType)==='floors'?'floors':'number';
  const value=clean(condition.value).slice(0,60);
  if(!field)throw Object.assign(new Error('Enter the form question name for every Premium condition'),{code:'INVALID_LEAD_CLASSIFICATION_SETTINGS'});
  if(numericValue(value,fieldType)===null)throw Object.assign(new Error('Enter a numeric threshold; floors also accepts values such as G+3'),{code:'INVALID_LEAD_CLASSIFICATION_SETTINGS'});
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
  const row=(await client.query('SELECT * FROM lead_classification_settings WHERE id=1')).rows[0];
  return normalizeSettings(row||{});
}
async function updateSettings(data={},adminUserId){
  const current=await getSettings();
  const settings=normalizeSettings({
    enabled:data.enabled===undefined?current.enabled:Boolean(data.enabled),
    matchMode:data.matchMode??current.matchMode,
    premiumConditions:data.premiumConditions??current.premiumConditions
  });
  const row=(await pool.query(
    `INSERT INTO lead_classification_settings(id,enabled,match_mode,premium_conditions,updated_by,updated_at)
     VALUES(1,$1,$2,$3::jsonb,$4,CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET enabled=EXCLUDED.enabled,match_mode=EXCLUDED.match_mode,
       premium_conditions=EXCLUDED.premium_conditions,updated_by=EXCLUDED.updated_by,updated_at=CURRENT_TIMESTAMP
     RETURNING *`,
    [settings.enabled,settings.matchMode,JSON.stringify(settings.premiumConditions),adminUserId||null]
  )).rows[0];
  return normalizeSettings(row);
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
function classify(custom,settings){
  if(!settings||settings.enabled!==true)return null;
  const conditions=Array.isArray(settings.premiumConditions)?settings.premiumConditions:[];
  if(!conditions.length)return'basic';
  const result=settings.matchMode==='any'?conditions.some(condition=>matchesCondition(custom,condition)):conditions.every(condition=>matchesCondition(custom,condition));
  return result?'premium':'basic';
}
module.exports={getSettings,updateSettings,classify,normalizeSettings,numericValue};
