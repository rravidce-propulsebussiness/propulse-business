const pool=require('../config/database');
const emailService=require('./emailService');

const CATEGORIES=new Set(['payment','wallet','lead','membership','payout','security','system','sheet']);
const SEVERITIES=new Set(['info','success','warning','critical']);
const SECRET_KEY=/(password|token|secret|cookie|authorization|proof|account_number|manual_reference|transfer_reference|utr|credential)/i;

function sanitizeMetadata(value,depth=0){
  if(value===null||value===undefined)return value;
  if(depth>4)return '[max-depth]';
  if(value instanceof Date)return Number.isFinite(value.getTime())?value.toISOString():null;
  if(Array.isArray(value))return value.slice(0,50).map(item=>sanitizeMetadata(item,depth+1));
  if(typeof value==='object'){
    const out={};
    for(const [key,val] of Object.entries(value)){
      if(SECRET_KEY.test(key)){out[key]='[redacted]';continue}
      out[key]=sanitizeMetadata(val,depth+1);
    }
    return out;
  }
  if(typeof value==='string')return value.length>1000?value.slice(0,1000)+'…':value;
  if(['number','boolean'].includes(typeof value))return value;
  if(typeof value==='bigint')return value.toString();
  return String(value);
}
function cleanActionUrl(value){
  const url=String(value||'').trim();
  if(!url)return null;
  if(!url.startsWith('/')||url.startsWith('//'))return null;
  return url.slice(0,500);
}
function cleanText(value,max){
  return String(value||'').trim().slice(0,max);
}
async function notifyUser({
  userId,type,category='system',severity='info',title,message,actionUrl=null,relatedType=null,relatedId=null,
  metadata={},dedupeKey=null,email=true
},client=pool){
  const uid=Number(userId);
  if(!Number.isInteger(uid)||uid<=0||!type||!title||!message)return null;
  const safeCategory=CATEGORIES.has(String(category))?String(category):'system';
  const safeSeverity=SEVERITIES.has(String(severity))?String(severity):'info';
  const safeDedupe=dedupeKey?cleanText(dedupeKey,180):null;
  const values=[
    uid,cleanText(type,80),safeCategory,safeSeverity,cleanText(title,180),cleanText(message,4000),cleanActionUrl(actionUrl),
    relatedType?cleanText(relatedType,60):null,relatedId===null||relatedId===undefined?null:cleanText(relatedId,120),
    JSON.stringify(sanitizeMetadata(metadata||{})),safeDedupe
  ];
  const row=(await client.query(
    `WITH inserted AS (
       INSERT INTO notifications(
         user_id,type,category,severity,title,message,action_url,related_type,related_id,metadata,dedupe_key
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
       ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
       RETURNING notifications.*,TRUE AS inserted
     )
     SELECT * FROM inserted
     UNION ALL
     SELECT n.*,FALSE AS inserted
       FROM notifications n
      WHERE $11::varchar IS NOT NULL
        AND n.user_id=$1 AND n.dedupe_key=$11
        AND NOT EXISTS(SELECT 1 FROM inserted)
     LIMIT 1`,
    values
  )).rows[0];
  if(!row)return null;

  if(email&&row.inserted){
    const recipient=(await client.query(
      `SELECT u.email,u.name,COALESCE(p.email_enabled,TRUE) AS email_enabled
         FROM users u
         LEFT JOIN user_notification_preferences p ON p.user_id=u.id
        WHERE u.id=$1 AND u.is_active=TRUE`,
      [uid]
    )).rows[0];
    if(recipient?.email&&recipient.email_enabled){
      await client.query(
        `INSERT INTO notification_deliveries(notification_id,channel,status)
         VALUES($1,'email','pending')
         ON CONFLICT(notification_id,channel) DO NOTHING`,
        [row.id]
      );
    }
  }
  return row;
}
async function notifyAdmins(payload,client=pool){
  const admins=(await client.query(`SELECT id FROM users WHERE role='admin' AND is_active=TRUE ORDER BY id`)).rows;
  const rows=[];
  for(const admin of admins){
    const row=await notifyUser({...payload,userId:admin.id},client);
    if(row)rows.push(row);
  }
  return rows;
}
async function listForUser(userId,{category='all',unreadOnly=false,page=1,limit=30}={}){
  const uid=Number(userId),values=[uid],where=['user_id=$1'];
  if(category&&category!=='all'){values.push(String(category));where.push(`category=$${values.length}`)}
  if(String(unreadOnly)==='true'||unreadOnly===true)where.push('read_at IS NULL');
  const safePage=Math.max(1,Number(page)||1),safeLimit=Math.min(100,Math.max(1,Number(limit)||30)),offset=(safePage-1)*safeLimit;
  const base=where.join(' AND ');
  const count=(await pool.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE read_at IS NULL)::int AS unread FROM notifications WHERE ${base}`,values)).rows[0]||{};
  const params=[...values,safeLimit,offset];
  const items=(await pool.query(
    `SELECT id,type,category,severity,title,message,action_url,related_type,related_id,metadata,read_at,created_at
       FROM notifications WHERE ${base}
       ORDER BY created_at DESC,id DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
    params
  )).rows;
  const total=Number(count.total||0);
  return{items,total,unread:Number(count.unread||0),page:safePage,limit:safeLimit,pages:Math.ceil(total/safeLimit)};
}
async function unreadCount(userId){
  return Number((await pool.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND read_at IS NULL',[Number(userId)])).rows[0]?.count||0);
}
async function markRead(userId,notificationId){
  return (await pool.query(
    `UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP
      WHERE id=$1 AND user_id=$2 RETURNING id,read_at`,
    [Number(notificationId),Number(userId)]
  )).rows[0]||null;
}
async function markAllRead(userId){
  const result=await pool.query(
    `UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP
      WHERE user_id=$1 AND read_at IS NULL`,
    [Number(userId)]
  );
  return{updated:result.rowCount};
}
async function getPreferences(userId){
  const row=(await pool.query('SELECT email_enabled,updated_at FROM user_notification_preferences WHERE user_id=$1',[Number(userId)])).rows[0];
  return row||{email_enabled:true,updated_at:null};
}
async function updatePreferences(userId,{emailEnabled}={}){
  const enabled=emailEnabled!==false;
  return (await pool.query(
    `INSERT INTO user_notification_preferences(user_id,email_enabled,updated_at)
     VALUES($1,$2,CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET email_enabled=EXCLUDED.email_enabled,updated_at=CURRENT_TIMESTAMP
     RETURNING email_enabled,updated_at`,
    [Number(userId),enabled]
  )).rows[0];
}
async function claimEmailDeliveries(limit=25){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const rows=(await client.query(
      `WITH candidates AS (
         SELECT d.id
           FROM notification_deliveries d
          WHERE d.channel='email'
            AND (
              (d.status IN ('pending','retry') AND (d.next_attempt_at IS NULL OR d.next_attempt_at<=CURRENT_TIMESTAMP))
              OR (d.status='processing' AND d.updated_at<CURRENT_TIMESTAMP-INTERVAL '10 minutes')
            )
          ORDER BY d.created_at,d.id
          FOR UPDATE SKIP LOCKED
          LIMIT $1
       )
       UPDATE notification_deliveries d
          SET status='processing',attempt_count=d.attempt_count+1,updated_at=CURRENT_TIMESTAMP
         FROM candidates c
        WHERE d.id=c.id
        RETURNING d.*`,
      [Math.min(100,Math.max(1,Number(limit)||25))]
    )).rows;
    await client.query('COMMIT');
    return rows;
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
async function processEmailDeliveries({limit=25}={}){
  const claimed=await claimEmailDeliveries(limit);
  let sent=0,failed=0,skipped=0;
  for(const delivery of claimed){
    try{
      const row=(await pool.query(
        `SELECT n.id,n.title,n.message,n.action_url,n.severity,n.category,u.email,u.name,u.is_active,
                COALESCE(p.email_enabled,TRUE) AS email_enabled
           FROM notification_deliveries d
           JOIN notifications n ON n.id=d.notification_id
           JOIN users u ON u.id=n.user_id
           LEFT JOIN user_notification_preferences p ON p.user_id=u.id
          WHERE d.id=$1`,
        [delivery.id]
      )).rows[0];
      if(!row||!row.email||!row.is_active||row.email_enabled===false){
        const reason=!row||!row.email?'Recipient unavailable':!row.is_active?'Recipient inactive':'Email notifications disabled';
        await pool.query(`UPDATE notification_deliveries SET status='skipped',last_error=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`,[reason,delivery.id]);
        skipped++;continue;
      }
      if(!emailService.isConfigured()){
        await pool.query(`UPDATE notification_deliveries SET status='skipped',last_error='Email provider not configured',updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[delivery.id]);
        skipped++;continue;
      }
      const result=await emailService.sendNotificationEmail({
        to:row.email,name:row.name,title:row.title,message:row.message,actionUrl:row.action_url,severity:row.severity,category:row.category
      });
      await pool.query(
        `UPDATE notification_deliveries SET status='sent',provider_message_id=$1,sent_at=CURRENT_TIMESTAMP,last_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=$2`,
        [result?.id||null,delivery.id]
      );
      sent++;
    }catch(error){
      const attempts=Number(delivery.attempt_count||1);
      const terminal=attempts>=5;
      const minutes=attempts<=1?5:attempts===2?15:attempts===3?60:360;
      await pool.query(
        `UPDATE notification_deliveries
            SET status=$1,next_attempt_at=CASE WHEN $1='retry' THEN CURRENT_TIMESTAMP+($2*INTERVAL '1 minute') ELSE NULL END,
                last_error=$3,updated_at=CURRENT_TIMESTAMP
          WHERE id=$4`,
        [terminal?'failed':'retry',minutes,String(error?.message||'Email delivery failed').slice(0,500),delivery.id]
      );
      failed++;
    }
  }
  return{claimed:claimed.length,sent,failed,skipped};
}
async function enqueueMembershipExpiryNotifications(){
  const rows=(await pool.query(
    `SELECT m.id,m.user_id,m.expires_at,mp.name AS plan_name
       FROM memberships m
       JOIN membership_plans mp ON mp.id=m.membership_plan_id
      WHERE m.status='active'
        AND m.expires_at>CURRENT_TIMESTAMP
        AND m.expires_at<=CURRENT_TIMESTAMP+INTERVAL '7 days'
      ORDER BY m.expires_at,m.id`
  )).rows;
  let queued=0;
  for(const row of rows){
    const hours=Math.max(0,(new Date(row.expires_at).getTime()-Date.now())/3600000);
    const bucket=hours<=24?'1d':'7d';
    const title=hours<=24?'Membership expires within 24 hours':'Membership expires soon';
    const message=hours<=24
      ? `${row.plan_name||'Your membership'} expires within 24 hours. Renew to keep uninterrupted access.`
      : `${row.plan_name||'Your membership'} expires within 7 days. Review your plan before access ends.`;
    const notification=await notifyUser({
      userId:row.user_id,type:'membership_expiring',category:'membership',severity:hours<=24?'warning':'info',
      title,message,actionUrl:'/membership',relatedType:'membership',relatedId:row.id,
      dedupeKey:`membership-expiry:${row.id}:${bucket}`,metadata:{expiresAt:row.expires_at,planName:row.plan_name}
    });
    if(notification)queued++;
  }
  return{checked:rows.length,queued};
}
module.exports={
  sanitizeMetadata,notifyUser,notifyAdmins,listForUser,unreadCount,markRead,markAllRead,getPreferences,updatePreferences,
  claimEmailDeliveries,processEmailDeliveries,enqueueMembershipExpiryNotifications
};
