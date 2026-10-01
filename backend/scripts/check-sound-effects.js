const fs=require('fs');
const path=require('path');

const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function must(file,tokens){
  const source=read(file);
  for(const token of tokens){
    if(!source.includes(token))throw new Error(file+' missing '+token);
  }
}

must('src/database/migrations/20261002_sound_effect_settings.sql',[
  'sound_effect_settings','master_enabled','notification_enabled','default_volume'
]);
must('src/services/soundSettingsService.js',[
  'getPublicSettings','updateSettings','defaultVolume','notificationEnabled'
]);
must('src/controllers/soundSettingsController.js',['getPublic','getAdmin','updateAdmin']);
must('src/routes/soundSettingsRoutes.js',["router.get('/',controller.getPublic)"]);
must('src/routes/adminRoutes.js',["/sound-effects","soundSettingsController"]);
must('src/server.js',["/api/sound-settings","soundSettingsRoutes"]);
must('../frontend/src/utils/soundEffects.js',[
  'AudioContext','propulse_sound_enabled','propulse_sound_volume','playSound','interactionReady','schedulePattern','ctx.resume()','notification','upload','success','warning'
]);
must('../frontend/src/components/SoundControl.jsx',['Website sound','Personal volume','Test sound','playSound','setSoundEnabled','setSoundVolume']);
must('../frontend/src/admin/pages/AdminSoundEffects.jsx',[
  'Master sound effects','Button & link click','Upload complete','Notifications','Default volume'
]);
must('../frontend/src/App.jsx',["/admin/sound-effects","<SoundControl/>"]);
must('../frontend/src/admin/components/AdminLayout.jsx',["/admin/sound-effects","Sound Effects"]);
must('../frontend/src/components/NotificationBell.jsx',["playSound('notification')"]);
must('../frontend/src/pages/Profile.jsx',["playSound('upload')","playSound('success')","playSound('warning')"]);

const soundSource=read('../frontend/src/utils/soundEffects.js');
if(/\.(?:mp3|wav|ogg)(?:['\"`?#)\\s]|$)/i.test(soundSource))throw new Error('Sound engine must not depend on external audio files');
if(!soundSource.includes("window.addEventListener('pointerdown'"))throw new Error('Sound engine must unlock only after user interaction');

console.log('Website sound effects static checks passed.');
