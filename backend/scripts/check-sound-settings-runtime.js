const assert=require('assert');
const pool=require('../src/config/database');
const soundSettingsService=require('../src/services/soundSettingsService');

async function main(){
  const original=(await pool.query(
    'SELECT master_enabled,click_enabled,success_enabled,warning_enabled,upload_enabled,notification_enabled,default_volume,updated_by,updated_at FROM sound_effect_settings WHERE id=1'
  )).rows[0];
  try{
    const updated=await soundSettingsService.updateSettings(null,{
      masterEnabled:false,
      clickEnabled:false,
      successEnabled:true,
      warningEnabled:true,
      uploadEnabled:false,
      notificationEnabled:true,
      defaultVolume:0.275,
    });
    assert.strictEqual(updated.masterEnabled,false);
    assert.strictEqual(updated.clickEnabled,false);
    assert.strictEqual(updated.uploadEnabled,false);
    assert.strictEqual(updated.notificationEnabled,true);
    assert.strictEqual(Number(updated.defaultVolume),0.275);

    const publicSettings=await soundSettingsService.getPublicSettings();
    assert.deepStrictEqual(Object.keys(publicSettings).sort(),[
      'clickEnabled','defaultVolume','masterEnabled','notificationEnabled','successEnabled','uploadEnabled','warningEnabled'
    ].sort());
    assert.strictEqual(publicSettings.updatedBy,undefined);
    assert.strictEqual(publicSettings.updatedAt,undefined);

    const clamped=await soundSettingsService.updateSettings(null,{defaultVolume:5});
    assert.strictEqual(Number(clamped.defaultVolume),0.5);

    console.log('Website sound settings runtime checks passed.');
  }finally{
    if(original){
      await pool.query(
        `UPDATE sound_effect_settings
         SET master_enabled=$1,click_enabled=$2,success_enabled=$3,warning_enabled=$4,
             upload_enabled=$5,notification_enabled=$6,default_volume=$7,updated_by=$8,updated_at=$9
         WHERE id=1`,
        [
          original.master_enabled,original.click_enabled,original.success_enabled,original.warning_enabled,
          original.upload_enabled,original.notification_enabled,original.default_volume,original.updated_by,original.updated_at
        ]
      );
    }
    await pool.end();
  }
}

main().catch(error=>{console.error(error);process.exitCode=1;});
