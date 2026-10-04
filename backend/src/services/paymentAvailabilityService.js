const pool=require('../config/database');
const audit=require('./criticalActionAuditService');

const DEFAULTS={
  offline_enabled:true,
  online_enabled:false,
  online_display_mode:'coming_soon',
  online_label:'Pay Online',
  online_coming_soon_message:'Online payment is coming soon.',
  offline_label:'UPI / Bank Transfer'
};

function normalize(row){
  const value=row||DEFAULTS;
  return{
    offlineEnabled:value.offline_enabled!==false,
    onlineEnabled:value.online_enabled===true,
    onlineDisplayMode:['live','coming_soon','hidden'].includes(String(value.online_display_mode))?String(value.online_display_mode):'coming_soon',
    onlineLabel:String(value.online_label||DEFAULTS.online_label),
    onlineComingSoonMessage:String(value.online_coming_soon_message||DEFAULTS.online_coming_soon_message),
    offlineLabel:String(value.offline_label||DEFAULTS.offline_label),
    updatedAt:value.updated_at||null,
    updatedBy:value.updated_by||null
  };
}
async function get(db=pool){
  const row=(await db.query('SELECT * FROM payment_availability_settings WHERE id=1')).rows[0];
  return normalize(row);
}
function text(value,fallback,max){
  const cleaned=String(value??'').trim();
  return (cleaned||fallback).slice(0,max);
}
async function update({offlineEnabled,onlineEnabled,onlineDisplayMode,onlineLabel,onlineComingSoonMessage,offlineLabel,adminId}){
  const mode=String(onlineDisplayMode||'coming_soon');
  if(!['live','coming_soon','hidden'].includes(mode))throw Object.assign(new Error('Online display mode must be live, coming soon, or hidden'),{code:'INVALID_ONLINE_DISPLAY_MODE'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const before=normalize((await client.query('SELECT * FROM payment_availability_settings WHERE id=1 FOR UPDATE')).rows[0]);
    const effectiveMode=onlineEnabled===true?'live':mode==='live'?'coming_soon':mode;
    const row=(await client.query(
      'UPDATE payment_availability_settings SET offline_enabled=$1,online_enabled=$2,online_display_mode=$3,online_label=$4,online_coming_soon_message=$5,offline_label=$6,updated_by=$7,updated_at=CURRENT_TIMESTAMP WHERE id=1 RETURNING *',
      [
        offlineEnabled!==false,onlineEnabled===true,effectiveMode,
        text(onlineLabel,DEFAULTS.online_label,80),
        text(onlineComingSoonMessage,DEFAULTS.online_coming_soon_message,220),
        text(offlineLabel,DEFAULTS.offline_label,80),
        adminId||null
      ]
    )).rows[0];
    const after=normalize(row);
    await audit.record(client,{
      actorId:adminId,category:'payment',action:'payment.availability_settings',
      entityType:'payment_availability_settings',entityId:1,beforeData:before,afterData:after,
      source:'payment_availability_service'
    });
    await client.query('COMMIT');
    return after;
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
async function requireOffline(db=pool){
  const settings=await get(db);
  if(!settings.offlineEnabled)throw Object.assign(new Error('Direct UPI / bank payment is currently unavailable'),{code:'OFFLINE_PAYMENT_DISABLED'});
  return settings;
}
async function requireOnline(db=pool){
  const settings=await get(db);
  if(settings.onlineEnabled&&settings.onlineDisplayMode==='live')return settings;
  if(settings.onlineDisplayMode==='coming_soon')throw Object.assign(new Error(settings.onlineComingSoonMessage),{code:'GATEWAY_COMING_SOON'});
  throw Object.assign(new Error('Online payment is currently unavailable'),{code:'GATEWAY_DISABLED'});
}
module.exports={get,update,requireOffline,requireOnline,normalize,DEFAULTS};
