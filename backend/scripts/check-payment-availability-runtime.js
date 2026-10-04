const pool=require('../src/config/database');
const settings=require('../src/services/paymentAvailabilityService');
const assert=(v,m)=>{if(!v)throw new Error(m)};

(async()=>{
  const suffix=Date.now();
  const admin=(await pool.query("INSERT INTO users(name,email,password_hash,role,is_active) VALUES($1,$2,'x','admin',TRUE) RETURNING id",['Payment Settings CI','payment-settings-'+suffix+'@example.test'])).rows[0];
  const original=await settings.get();
  try{
    let saved=await settings.update({offlineEnabled:true,onlineEnabled:false,onlineDisplayMode:'coming_soon',onlineLabel:'Pay Online',onlineComingSoonMessage:'Gateway launch soon',offlineLabel:'UPI / Bank',adminId:admin.id});
    assert(saved.offlineEnabled===true&&saved.onlineEnabled===false&&saved.onlineDisplayMode==='coming_soon','Coming Soon settings did not persist');
    let comingSoon=false;
    try{await settings.requireOnline()}catch(error){comingSoon=error.code==='GATEWAY_COMING_SOON'}
    assert(comingSoon,'Coming Soon mode must reject gateway checkout');
    await settings.requireOffline();

    saved=await settings.update({offlineEnabled:false,onlineEnabled:true,onlineDisplayMode:'coming_soon',onlineLabel:'Secure Online',onlineComingSoonMessage:'Soon',offlineLabel:'Manual Transfer',adminId:admin.id});
    assert(saved.onlineEnabled===true&&saved.onlineDisplayMode==='live','Enabling online payment must make it live');
    let offlineBlocked=false;
    try{await settings.requireOffline()}catch(error){offlineBlocked=error.code==='OFFLINE_PAYMENT_DISABLED'}
    assert(offlineBlocked,'Disabling offline payment must reject manual settlement');
    await settings.requireOnline();

    saved=await settings.update({offlineEnabled:false,onlineEnabled:false,onlineDisplayMode:'hidden',onlineLabel:'Pay Online',onlineComingSoonMessage:'Soon',offlineLabel:'Manual',adminId:admin.id});
    assert(saved.offlineEnabled===false&&saved.onlineEnabled===false&&saved.onlineDisplayMode==='hidden','Both payment methods must be independently disable-able');
    let hiddenBlocked=false;
    try{await settings.requireOnline()}catch(error){hiddenBlocked=error.code==='GATEWAY_DISABLED'}
    assert(hiddenBlocked,'Hidden online mode must reject gateway checkout');

    const auditCount=Number((await pool.query("SELECT COUNT(*)::int AS count FROM critical_action_audit WHERE actor_user_id=$1 AND action='payment.availability_settings'",[admin.id])).rows[0].count);
    assert(auditCount>=3,'Payment availability changes must create audit records');
  }finally{
    await settings.update({...original,adminId:admin.id}).catch(()=>{});
    await pool.query("DELETE FROM critical_action_audit WHERE actor_user_id=$1",[admin.id]);
    await pool.query('DELETE FROM users WHERE id=$1',[admin.id]);
  }
  console.log('Payment availability PostgreSQL runtime smoke passed.');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1}).finally(()=>pool.end());
