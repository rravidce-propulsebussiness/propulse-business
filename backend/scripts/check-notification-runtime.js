const pool=require('../src/config/database');
const notifications=require('../src/services/notificationService');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

(async()=>{
  const suffix=Date.now();
  const user=(await pool.query(
    `INSERT INTO users(name,email,password_hash,role,is_active) VALUES($1,$2,$3,'business',TRUE) RETURNING id`,
    ['Notification CI','notification-ci-'+suffix+'@example.test','not-a-real-hash']
  )).rows[0];
  const admin=(await pool.query(
    `INSERT INTO users(name,email,password_hash,role,is_active) VALUES($1,$2,$3,'admin',TRUE) RETURNING id`,
    ['Notification Admin CI','notification-admin-ci-'+suffix+'@example.test','not-a-real-hash']
  )).rows[0];

  const first=await notifications.notifyUser({
    userId:user.id,type:'ci_notification',category:'system',severity:'info',title:'CI notification',message:'Notification runtime smoke',
    actionUrl:'/wallet',relatedType:'ci',relatedId:'1',dedupeKey:'ci-dedupe-'+suffix,
    metadata:{manual_reference:'UTR-RAW-DO-NOT-STORE',safe:'ok'}
  });
  const second=await notifications.notifyUser({
    userId:user.id,type:'ci_notification',category:'system',severity:'info',title:'CI notification',message:'Duplicate delivery',
    actionUrl:'/wallet',relatedType:'ci',relatedId:'1',dedupeKey:'ci-dedupe-'+suffix
  });
  assert(Number(first.id)===Number(second.id),'Same user + dedupe key must return one notification');
  const count=Number((await pool.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND dedupe_key=$2',[user.id,'ci-dedupe-'+suffix])).rows[0].count);
  assert(count===1,'Deduplicated notification must have one database row');

  const stored=(await pool.query('SELECT metadata FROM notifications WHERE id=$1',[first.id])).rows[0];
  assert(stored.metadata.manual_reference==='[redacted]'&&stored.metadata.safe==='ok','Sensitive notification metadata must be redacted');
  const deliveries=Number((await pool.query('SELECT COUNT(*)::int AS count FROM notification_deliveries WHERE notification_id=$1',[first.id])).rows[0].count);
  assert(deliveries===1,'Email-enabled user notification must enqueue one outbox delivery');

  let listed=await notifications.listForUser(user.id,{page:1,limit:10});
  assert(listed.unread===1&&listed.items.some(x=>Number(x.id)===Number(first.id)),'Unread notification must be visible');
  await notifications.markRead(user.id,first.id);
  assert(await notifications.unreadCount(user.id)===0,'Mark read must update unread count');

  await notifications.updatePreferences(user.id,{emailEnabled:false});
  const pref=await notifications.getPreferences(user.id);
  assert(pref.email_enabled===false,'Email preference must persist');
  const deliveryResult=await notifications.processEmailDeliveries({limit:10});
  assert(deliveryResult.skipped>=1,'Queued email must be skipped after the user disables email notifications');
  const queuedDelivery=(await pool.query('SELECT status,last_error FROM notification_deliveries WHERE notification_id=$1',[first.id])).rows[0];
  assert(queuedDelivery.status==='skipped'&&queuedDelivery.last_error==='Email notifications disabled','Worker must honor the latest email preference at send time');
  const noEmail=await notifications.notifyUser({
    userId:user.id,type:'ci_no_email',category:'system',title:'No email',message:'Preference disabled',
    dedupeKey:'ci-no-email-'+suffix,email:true
  });
  const noEmailDeliveries=Number((await pool.query('SELECT COUNT(*)::int AS count FROM notification_deliveries WHERE notification_id=$1',[noEmail.id])).rows[0].count);
  assert(noEmailDeliveries===0,'Disabled email preference must prevent new email outbox rows');

  await notifications.notifyAdmins({
    type:'ci_admin_alert',category:'system',severity:'warning',title:'CI admin alert',message:'Admin notification smoke',
    dedupeKey:'ci-admin-'+suffix,email:false
  });
  const adminCount=Number((await pool.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND dedupe_key=$2',[admin.id,'ci-admin-'+suffix])).rows[0].count);
  assert(adminCount===1,'Active admins must receive Admin notifications');

  await notifications.markAllRead(user.id);
  listed=await notifications.listForUser(user.id,{unreadOnly:true,page:1,limit:10});
  assert(listed.total===0,'Mark all read must clear unread-only results');

  await pool.query('DELETE FROM users WHERE id=ANY($1::int[])',[[user.id,admin.id]]);
  console.log('Central notification PostgreSQL runtime smoke passed.');
})().catch(async error=>{console.error(error.stack||error);process.exitCode=1}).finally(()=>pool.end());
