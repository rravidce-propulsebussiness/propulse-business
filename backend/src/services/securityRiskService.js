const crypto=require('crypto');
const pool=require('../config/database');
const criticalActionAudit=require('./criticalActionAuditService');
const notificationService=require('./notificationService');

const secret=String(process.env.RISK_EVENT_HASH_SECRET||process.env.JWT_SECRET||'propulse-development-risk-secret');

function hmac(value){
  return crypto.createHmac('sha256',secret).update(String(value??'').trim().toLowerCase()).digest('hex');
}
function maskEmail(email){
  const value=String(email||'').trim().toLowerCase();
  const [local,domain]=value.split('@');
  if(!domain)return null;
  return (local?.slice(0,1)||'*')+'***@'+domain;
}
function accountHint(account){
  if(!account)return null;
  if(account.method==='upi')return String(account.upi_id||account.upiId||'').replace(/^(.{1,2}).*(@.*)$/,'$1***$2')||'UPI';
  const number=String(account.account_number||account.accountNumber||'');
  return number?'••••'+number.slice(-4):'Bank account';
}
function accountFingerprint(account){
  if(!account)return null;
  if(account.method==='upi')return hmac('upi:'+String(account.upi_id||account.upiId||'').toLowerCase());
  return hmac('bank:'+String(account.account_number||account.accountNumber||'')+':'+String(account.ifsc_code||account.ifscCode||'').toUpperCase());
}
async function upsertEvent({
  eventType,eventKey,severity='medium',userId=null,relatedType=null,relatedId=null,title,summary,metadata={}
},client=pool){
  const key=String(eventKey||'').slice(0,180);
  if(!eventType||!key||!title||!summary)return null;
  const row=(await client.query(
    `INSERT INTO security_risk_events(
       event_type,event_key,severity,user_id,related_type,related_id,title,summary,metadata
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
     ON CONFLICT(event_type,event_key) WHERE status='open' DO UPDATE SET
       severity=CASE
         WHEN (CASE EXCLUDED.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END)
            > (CASE security_risk_events.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END)
         THEN EXCLUDED.severity ELSE security_risk_events.severity END,
       user_id=COALESCE(EXCLUDED.user_id,security_risk_events.user_id),
       related_type=COALESCE(EXCLUDED.related_type,security_risk_events.related_type),
       related_id=COALESCE(EXCLUDED.related_id,security_risk_events.related_id),
       title=EXCLUDED.title,summary=EXCLUDED.summary,metadata=EXCLUDED.metadata,
       occurrence_count=security_risk_events.occurrence_count+1,
       last_seen_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
     RETURNING *`,
    [eventType,key,severity,userId||null,relatedType||null,relatedId||null,title,summary,JSON.stringify(metadata||{})]
  )).rows[0];
  if(row&&['high','critical'].includes(String(row.severity))){
    await notificationService.notifyAdmins({
      type:'security_risk_event',category:'security',severity:row.severity==='critical'?'critical':'warning',
      title:row.title,message:row.summary,actionUrl:'/admin/risk-center',
      relatedType:'security_risk_event',relatedId:row.id,
      dedupeKey:`security-risk-event:${row.id}`,
      metadata:{eventType:row.event_type,severity:row.severity,occurrenceCount:Number(row.occurrence_count||1)}
    },client);
  }
  return row;
}

async function recordFailedLogin({email,userId=null,source=null}){
  const normalized=String(email||'').trim().toLowerCase();
  if(!normalized)return null;
  const subjectHash=hmac('login:'+normalized);
  const sourceHash=source?hmac('source:'+source):null;
  await pool.query(
    `INSERT INTO security_auth_attempts(subject_hash,user_id,source_hash,succeeded)
     VALUES($1,$2,$3,FALSE)`,
    [subjectHash,userId||null,sourceHash]
  );
  await pool.query(`DELETE FROM security_auth_attempts WHERE created_at<CURRENT_TIMESTAMP-INTERVAL '30 days'`).catch(()=>{});
  const row=(await pool.query(
    `SELECT COUNT(*)::int AS attempts,
            COUNT(DISTINCT source_hash) FILTER(WHERE source_hash IS NOT NULL)::int AS sources
       FROM security_auth_attempts
      WHERE subject_hash=$1 AND succeeded=FALSE
        AND created_at>=CURRENT_TIMESTAMP-INTERVAL '15 minutes'`,
    [subjectHash]
  )).rows[0]||{};
  const attempts=Number(row.attempts||0);
  if(attempts<5)return null;
  const severity=attempts>=12?'critical':attempts>=8?'high':'medium';
  return upsertEvent({
    eventType:'repeated_failed_login',
    eventKey:subjectHash,
    severity,
    userId,
    relatedType:'user',
    relatedId:userId,
    title:'Repeated failed sign-in attempts',
    summary:`${attempts} failed sign-in attempts were recorded for the same account target within 15 minutes.`,
    metadata:{attempts,windowMinutes:15,sourceCount:Number(row.sources||0),emailHint:maskEmail(normalized),knownUser:Boolean(userId)}
  });
}

async function recordDuplicatePaymentReference({userId,paymentId,reference,existingPaymentId}){
  const fingerprint=hmac('payment-reference:'+String(reference||''));
  return upsertEvent({
    eventType:'duplicate_payment_reference',
    eventKey:fingerprint,
    severity:'high',
    userId,
    relatedType:'payment',
    relatedId:paymentId,
    title:'Duplicate payment reference blocked',
    summary:'A payment reference / UTR that was already used was submitted again and blocked.',
    metadata:{fingerprint:fingerprint.slice(0,12),paymentId:Number(paymentId)||null,existingPaymentId:Number(existingPaymentId)||null}
  });
}

async function recordLeadPurchaseBurst(client,{userId,purchaseId}){
  const row=(await client.query(
    `SELECT COUNT(*)::int AS purchases,
            COALESCE(SUM(amount),0)::numeric AS amount
       FROM lead_purchases
      WHERE user_id=$1
        AND status IN ('paid','pending_payment')
        AND created_at>=CURRENT_TIMESTAMP-INTERVAL '10 minutes'`,
    [Number(userId)]
  )).rows[0]||{};
  const purchases=Number(row.purchases||0);
  if(purchases<5)return null;
  const severity=purchases>=12?'high':'medium';
  return upsertEvent({
    eventType:'rapid_lead_purchase',
    eventKey:'user:'+Number(userId),
    severity,
    userId,
    relatedType:'lead_purchase',
    relatedId:purchaseId,
    title:'Rapid lead-purchase activity',
    summary:`${purchases} lead purchases or pending purchases were created by the same user within 10 minutes.`,
    metadata:{purchases,windowMinutes:10,amount:Number(row.amount||0)}
  },client);
}

async function evaluatePayoutAccountChange(client,{userId,accountType,newAccount,previousAccount=null}){
  const uid=Number(userId);
  const type=String(accountType||'payout');
  const fingerprint=accountFingerprint(newAccount);
  if(!fingerprint)return [];
  const events=[];
  if(previousAccount){
    const previousFingerprint=accountFingerprint(previousAccount);
    if(previousFingerprint&&previousFingerprint!==fingerprint){
      const ageHours=Math.max(0,(Date.now()-new Date(previousAccount.created_at||previousAccount.updated_at||Date.now()).getTime())/3600000);
      const countRow=(await client.query(
        type==='investor'
          ? `SELECT COUNT(*)::int AS changes FROM investor_payout_accounts WHERE user_id=$1 AND created_at>=CURRENT_TIMESTAMP-INTERVAL '30 days'`
          : `SELECT COUNT(*)::int AS changes FROM lead_partner_payout_accounts WHERE user_id=$1 AND created_at>=CURRENT_TIMESTAMP-INTERVAL '30 days'`,
        [uid]
      )).rows[0]||{};
      const changes=Number(countRow.changes||0);
      if(ageHours<=168||changes>=3){
        events.push(await upsertEvent({
          eventType:'rapid_payout_account_change',
          eventKey:type+':user:'+uid,
          severity:changes>=4?'high':'medium',
          userId:uid,
          relatedType:type+'_payout_account',
          title:'Payout account changed repeatedly',
          summary:'A payout destination was replaced soon after a previous payout account or multiple times within 30 days.',
          metadata:{accountType:type,method:newAccount.method,accountHint:accountHint(newAccount),previousAgeHours:Number(ageHours.toFixed(1)),changesIn30Days:changes}
        },client));
      }
    }
  }

  const params=newAccount.method==='upi'
    ? [String(newAccount.upi_id||newAccount.upiId||'').toLowerCase(),uid]
    : [String(newAccount.account_number||newAccount.accountNumber||''),String(newAccount.ifsc_code||newAccount.ifscCode||'').toUpperCase(),uid];
  const investorQuery=newAccount.method==='upi'
    ? `SELECT DISTINCT user_id FROM investor_payout_accounts WHERE LOWER(upi_id)=$1 AND user_id<>$2`
    : `SELECT DISTINCT user_id FROM investor_payout_accounts WHERE account_number=$1 AND UPPER(ifsc_code)=$2 AND user_id<>$3`;
  const partnerQuery=newAccount.method==='upi'
    ? `SELECT DISTINCT user_id FROM lead_partner_payout_accounts WHERE LOWER(upi_id)=$1 AND user_id<>$2`
    : `SELECT DISTINCT user_id FROM lead_partner_payout_accounts WHERE account_number=$1 AND UPPER(ifsc_code)=$2 AND user_id<>$3`;
  const [investorRows,partnerRows]=await Promise.all([
    client.query(investorQuery,params),
    client.query(partnerQuery,params)
  ]);
  const sharedUsers=[...new Set([...investorRows.rows,...partnerRows.rows].map(row=>Number(row.user_id)).filter(id=>id>0))];
  if(sharedUsers.length){
    events.push(await upsertEvent({
      eventType:'shared_payout_destination',
      eventKey:fingerprint,
      severity:sharedUsers.length>=2?'critical':'high',
      userId:uid,
      relatedType:type+'_payout_account',
      title:'Payout destination shared across accounts',
      summary:'The same bank account or UPI destination is configured by more than one Propulse user.',
      metadata:{accountType:type,method:newAccount.method,accountHint:accountHint(newAccount),sharedUserCount:sharedUsers.length,sharedUserIds:sharedUsers.slice(0,10),fingerprint:fingerprint.slice(0,12)}
    },client));
  }
  return events.filter(Boolean);
}

async function listEvents({status='open',severity='all',type='all',search='',page=1,limit=50}={}){
  const values=[],where=[];
  if(status&&status!=='all'){values.push(status);where.push(`e.status=$${values.length}`)}
  if(severity&&severity!=='all'){values.push(severity);where.push(`e.severity=$${values.length}`)}
  if(type&&type!=='all'){values.push(type);where.push(`e.event_type=$${values.length}`)}
  if(String(search||'').trim()){
    values.push('%'+String(search).trim()+'%');
    where.push(`(e.title ILIKE $${values.length} OR e.summary ILIKE $${values.length} OR u.name ILIKE $${values.length} OR u.email ILIKE $${values.length})`);
  }
  const safePage=Math.max(1,Number(page)||1),safeLimit=Math.min(100,Math.max(1,Number(limit)||50)),offset=(safePage-1)*safeLimit;
  const base=where.length?'WHERE '+where.join(' AND '):'';
  const from='security_risk_events e LEFT JOIN users u ON u.id=e.user_id LEFT JOIN users ru ON ru.id=e.reviewed_by';
  const [count,stats,types]=await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM ${from} ${base}`,values),
    pool.query(`SELECT COUNT(*) FILTER(WHERE status='open')::int AS open,
                       COUNT(*) FILTER(WHERE status='open' AND severity='critical')::int AS critical,
                       COUNT(*) FILTER(WHERE status='open' AND severity='high')::int AS high,
                       COUNT(*) FILTER(WHERE status='open' AND severity='medium')::int AS medium,
                       COUNT(*) FILTER(WHERE last_seen_at>=CURRENT_TIMESTAMP-INTERVAL '24 hours')::int AS last_24h
                  FROM security_risk_events`),
    pool.query(`SELECT event_type,COUNT(*)::int AS total FROM security_risk_events GROUP BY event_type ORDER BY event_type`)
  ]);
  const dataValues=[...values,safeLimit,offset];
  const items=(await pool.query(
    `SELECT e.*,u.name AS user_name,u.email AS user_email,ru.name AS reviewed_by_name
       FROM ${from} ${base}
      ORDER BY CASE e.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,
               e.last_seen_at DESC,e.id DESC
      LIMIT $${dataValues.length-1} OFFSET $${dataValues.length}`,
    dataValues
  )).rows;
  const total=Number(count.rows[0]?.total||0);
  return{items,total,page:safePage,limit:safeLimit,pages:Math.ceil(total/safeLimit),stats:stats.rows[0]||{},types:types.rows};
}

async function reviewEvent({eventId,status,note,adminId}){
  if(!['resolved','dismissed'].includes(status))throw Object.assign(new Error('Select resolved or dismissed'),{code:'INVALID_RISK_REVIEW'});
  const reviewNote=String(note||'').trim();
  if(!reviewNote)throw Object.assign(new Error('A review note is required'),{code:'RISK_REVIEW_NOTE_REQUIRED'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const before=(await client.query('SELECT id,event_type,severity,status,user_id,related_type,related_id,title,occurrence_count FROM security_risk_events WHERE id=$1 FOR UPDATE',[Number(eventId)])).rows[0];
    if(!before||before.status!=='open')throw Object.assign(new Error('Risk event was not found or already reviewed'),{code:'RISK_EVENT_NOT_OPEN'});
    const row=(await client.query(
      `UPDATE security_risk_events SET status=$1,reviewed_by=$2,reviewed_at=CURRENT_TIMESTAMP,
          review_note=$3,updated_at=CURRENT_TIMESTAMP
        WHERE id=$4 AND status='open' RETURNING *`,
      [status,adminId||null,reviewNote.slice(0,1000),Number(eventId)]
    )).rows[0];
    await criticalActionAudit.record(client,{actorId:adminId,category:'security',action:'security.risk_review',entityType:'security_risk_event',entityId:eventId,beforeData:before,afterData:{id:row.id,eventType:row.event_type,severity:row.severity,status:row.status,userId:row.user_id,relatedType:row.related_type,relatedId:row.related_id,occurrenceCount:row.occurrence_count},reason:reviewNote,source:'security_risk_service'});
    await client.query('COMMIT');return row;
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}

module.exports={
  hmac,maskEmail,accountHint,accountFingerprint,upsertEvent,recordFailedLogin,recordDuplicatePaymentReference,
  recordLeadPurchaseBurst,evaluatePayoutAccountChange,listEvents,reviewEvent
};
