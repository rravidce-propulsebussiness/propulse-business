const pool=require('../config/database');

const STRATEGIES=Object.freeze(['permanent_single','auto_release','shared']);
const DEFAULTS=Object.freeze({
  basic:{leadType:'basic',defaultStrategy:'auto_release',maxBuyerCapacity:3,releaseToTwoAfterHours:24,releaseToThreeAfterHours:48},
  premium:{leadType:'premium',defaultStrategy:'auto_release',maxBuyerCapacity:3,releaseToTwoAfterHours:48,releaseToThreeAfterHours:96},
});

const clampCapacity=value=>{const n=Number(value);return Number.isFinite(n)?Math.min(3,Math.max(1,Math.floor(n))):3};
const normalizeStrategy=(value,fallback='shared')=>STRATEGIES.includes(String(value||'').trim().toLowerCase())?String(value).trim().toLowerCase():fallback;
const optionalHours=value=>{if(value===undefined||value===null||value==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?Math.floor(n):null};

function normalizeConfig(input={},fallback=DEFAULTS.basic){
  const strategy=normalizeStrategy(input.accessStrategy??input.defaultStrategy,fallback.defaultStrategy||'auto_release');
  const maxBuyerCapacity=strategy==='permanent_single'?1:clampCapacity(input.buyerCapacity??input.maxBuyerCapacity??fallback.maxBuyerCapacity);
  let releaseToTwoAfterHours=optionalHours(input.releaseToTwoAfterHours??fallback.releaseToTwoAfterHours);
  let releaseToThreeAfterHours=optionalHours(input.releaseToThreeAfterHours??fallback.releaseToThreeAfterHours);
  if(strategy!=='auto_release'){releaseToTwoAfterHours=null;releaseToThreeAfterHours=null}
  if(strategy==='auto_release'){
    if(maxBuyerCapacity<2)releaseToTwoAfterHours=null;
    if(maxBuyerCapacity<3)releaseToThreeAfterHours=null;
    if(maxBuyerCapacity>=2&&releaseToTwoAfterHours===null)releaseToTwoAfterHours=24;
    if(maxBuyerCapacity>=3&&releaseToThreeAfterHours===null)releaseToThreeAfterHours=Math.max(48,releaseToTwoAfterHours||0);
    if(releaseToTwoAfterHours!==null&&releaseToThreeAfterHours!==null&&releaseToThreeAfterHours<releaseToTwoAfterHours)throw Object.assign(new Error('Release-to-3 time must be after release-to-2 time'),{code:'INVALID_ACCESS_SETTINGS'});
  }
  return{accessStrategy:strategy,buyerCapacity:maxBuyerCapacity,releaseToTwoAfterHours,releaseToThreeAfterHours};
}

function effectiveCapacity(lead,at=new Date()){
  const cap=clampCapacity(lead?.buyer_capacity??lead?.buyerCapacity);
  const locked=optionalHours(lead?.access_capacity_locked??lead?.accessCapacityLocked);
  if(locked!==null)return Math.min(cap,clampCapacity(locked));
  const strategy=normalizeStrategy(lead?.access_strategy??lead?.accessStrategy,'shared');
  if(strategy==='permanent_single')return 1;
  if(strategy==='shared')return cap;
  const created=new Date(lead?.created_at??lead?.createdAt??at);
  const ageHours=Math.max(0,(at.getTime()-created.getTime())/3600000);
  const two=optionalHours(lead?.release_to_two_after_hours??lead?.releaseToTwoAfterHours);
  const three=optionalHours(lead?.release_to_three_after_hours??lead?.releaseToThreeAfterHours);
  if(cap>=3&&three!==null&&ageHours>=three)return 3;
  if(cap>=2&&two!==null&&ageHours>=two)return 2;
  return 1;
}

function nextReleaseAt(lead,at=new Date()){
  if(normalizeStrategy(lead?.access_strategy??lead?.accessStrategy,'shared')!=='auto_release'||lead?.access_capacity_locked!=null)return null;
  const current=effectiveCapacity(lead,at),created=new Date(lead?.created_at??lead?.createdAt??at);
  const two=optionalHours(lead?.release_to_two_after_hours??lead?.releaseToTwoAfterHours);
  const three=optionalHours(lead?.release_to_three_after_hours??lead?.releaseToThreeAfterHours);
  const hours=current<2?two:(current<3?three:null);
  return hours===null?null:new Date(created.getTime()+hours*3600000);
}

function pricingForCapacity(pricing,capacity){
  const shares=Array.isArray(pricing?.shares)?pricing.shares:[];
  const row=shares.find(item=>Number(item?.shares)===Number(capacity));
  return row?{...pricing,shares:[row]}:{...pricing,shares:[]};
}

async function getSettings(){
  const rows=(await pool.query(`SELECT lead_type,default_strategy,max_buyer_capacity,release_to_two_after_hours,release_to_three_after_hours FROM lead_access_settings ORDER BY lead_type`)).rows;
  const out={};
  for(const type of ['basic','premium']){
    const row=rows.find(x=>x.lead_type===type);
    const fallback=DEFAULTS[type];
    out[type]=row?normalizeConfig({
      defaultStrategy:row.default_strategy,
      maxBuyerCapacity:row.max_buyer_capacity,
      releaseToTwoAfterHours:row.release_to_two_after_hours,
      releaseToThreeAfterHours:row.release_to_three_after_hours,
    },fallback):normalizeConfig({},fallback);
  }
  return out;
}

async function getSettingsForType(leadType='basic'){
  const type=String(leadType).toLowerCase()==='premium'?'premium':'basic';
  const settings=await getSettings();
  return settings[type];
}

async function updateSettings(input={}){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const result={};
    for(const type of ['basic','premium']){
      const fallback=DEFAULTS[type];
      const cfg=normalizeConfig(input[type]||{},fallback);
      const row=(await client.query(`INSERT INTO lead_access_settings(lead_type,default_strategy,max_buyer_capacity,release_to_two_after_hours,release_to_three_after_hours,updated_at)
        VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)
        ON CONFLICT(lead_type) DO UPDATE SET default_strategy=EXCLUDED.default_strategy,max_buyer_capacity=EXCLUDED.max_buyer_capacity,release_to_two_after_hours=EXCLUDED.release_to_two_after_hours,release_to_three_after_hours=EXCLUDED.release_to_three_after_hours,updated_at=CURRENT_TIMESTAMP
        RETURNING *`,[type,cfg.accessStrategy,cfg.buyerCapacity,cfg.releaseToTwoAfterHours,cfg.releaseToThreeAfterHours])).rows[0];
      result[type]=normalizeConfig({defaultStrategy:row.default_strategy,maxBuyerCapacity:row.max_buyer_capacity,releaseToTwoAfterHours:row.release_to_two_after_hours,releaseToThreeAfterHours:row.release_to_three_after_hours},fallback);
    }
    await client.query('COMMIT');
    return result;
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}

async function resolveForLead({leadType='basic',accessStrategy,buyerCapacity,releaseToTwoAfterHours,releaseToThreeAfterHours}={}){
  const fallback=await getSettingsForType(leadType);
  return normalizeConfig({accessStrategy,buyerCapacity,releaseToTwoAfterHours,releaseToThreeAfterHours},fallback);
}

async function lockCapacity(client,leadId,capacity){
  const cap=clampCapacity(capacity);
  return (await client.query(`UPDATE leads SET access_capacity_locked=COALESCE(access_capacity_locked,$1),updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING access_capacity_locked`,[cap,leadId])).rows[0]?.access_capacity_locked||cap;
}

async function closeIfFull(client,leadId){
  const row=(await client.query(`SELECT l.id,l.status,lead_effective_buyer_capacity(l.access_strategy,l.buyer_capacity,l.release_to_two_after_hours,l.release_to_three_after_hours,l.created_at,l.access_capacity_locked) AS capacity,
    (SELECT COUNT(DISTINCT u.user_id)::int FROM (
      SELECT user_id FROM lead_purchases WHERE lead_id=l.id AND status='paid'
      UNION
      SELECT user_id FROM lead_entitlement_claims WHERE lead_id=l.id
    ) u) AS buyers
    FROM leads l WHERE l.id=$1 FOR UPDATE`,[leadId])).rows[0];
  if(row&&row.status==='available'&&Number(row.buyers)>=Number(row.capacity))await client.query(`UPDATE leads SET status='sold',updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND status='available'`,[leadId]);
  return row;
}

module.exports={STRATEGIES,DEFAULTS,clampCapacity,normalizeStrategy,normalizeConfig,effectiveCapacity,nextReleaseAt,pricingForCapacity,getSettings,getSettingsForType,updateSettings,resolveForLead,lockCapacity,closeIfFull};
