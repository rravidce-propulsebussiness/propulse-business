const pool=require('../config/database');

function normalize(row={}){
  return {
    masterEnabled:Boolean(row.master_enabled),
    clickEnabled:Boolean(row.click_enabled),
    successEnabled:Boolean(row.success_enabled),
    warningEnabled:Boolean(row.warning_enabled),
    uploadEnabled:Boolean(row.upload_enabled),
    notificationEnabled:Boolean(row.notification_enabled),
    defaultVolume:Number(row.default_volume??0.2),
    updatedBy:row.updated_by||null,
    updatedAt:row.updated_at||null,
  };
}

async function getSettings(client=pool){
  let result=await client.query(
    'SELECT master_enabled,click_enabled,success_enabled,warning_enabled,upload_enabled,notification_enabled,default_volume,updated_by,updated_at FROM sound_effect_settings WHERE id=1'
  );
  if(!result.rows.length){
    await client.query('INSERT INTO sound_effect_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING');
    result=await client.query(
      'SELECT master_enabled,click_enabled,success_enabled,warning_enabled,upload_enabled,notification_enabled,default_volume,updated_by,updated_at FROM sound_effect_settings WHERE id=1'
    );
  }
  return normalize(result.rows[0]);
}

async function getPublicSettings(){
  const settings=await getSettings();
  return {
    masterEnabled:settings.masterEnabled,
    clickEnabled:settings.clickEnabled,
    successEnabled:settings.successEnabled,
    warningEnabled:settings.warningEnabled,
    uploadEnabled:settings.uploadEnabled,
    notificationEnabled:settings.notificationEnabled,
    defaultVolume:settings.defaultVolume,
  };
}

function bool(value,fallback){
  return typeof value==='boolean'?value:fallback;
}

async function updateSettings(actorId,payload={}){
  const current=await getSettings();
  const volume=Number(payload.defaultVolume);
  const defaultVolume=Number.isFinite(volume)?Math.max(0,Math.min(0.5,volume)):current.defaultVolume;
  await pool.query(
    `UPDATE sound_effect_settings
     SET master_enabled=$1,
         click_enabled=$2,
         success_enabled=$3,
         warning_enabled=$4,
         upload_enabled=$5,
         notification_enabled=$6,
         default_volume=$7,
         updated_by=$8,
         updated_at=CURRENT_TIMESTAMP
     WHERE id=1`,
    [
      bool(payload.masterEnabled,current.masterEnabled),
      bool(payload.clickEnabled,current.clickEnabled),
      bool(payload.successEnabled,current.successEnabled),
      bool(payload.warningEnabled,current.warningEnabled),
      bool(payload.uploadEnabled,current.uploadEnabled),
      bool(payload.notificationEnabled,current.notificationEnabled),
      defaultVolume,
      actorId||null,
    ]
  );
  return getSettings();
}

module.exports={getSettings,getPublicSettings,updateSettings};
