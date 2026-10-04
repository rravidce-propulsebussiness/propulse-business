const pool=require('../src/config/database');
const audit=require('../src/services/criticalActionAuditService');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

(async()=>{
  await pool.query("DELETE FROM critical_action_audit WHERE source='ci_critical_audit'");
  const row=await audit.record(pool,{
    actorId:null,category:'system',action:'system.ci_audit_check',entityType:'ci_entity',entityId:'42',
    beforeData:{status:'pending',manual_reference:'UTR-DO-NOT-STORE',account_number:'123456789012',phone:'9876543210'},
    afterData:{status:'paid',manual_reference:'UTR-DO-NOT-STORE',account_number:'123456789012',phone:'9876543210'},
    reason:'CI audit verification',metadata:{password:'never-store',safe:'ok'},source:'ci_critical_audit'
  });
  assert(row&&row.id,'Audit record must be inserted');

  const stored=(await pool.query('SELECT * FROM critical_action_audit WHERE id=$1',[row.id])).rows[0];
  assert(stored.before_data.manual_reference==='[redacted]','Raw UTR must not be stored');
  assert(stored.before_data.account_number==='[redacted]','Full bank account must not be stored');
  assert(stored.before_data.phone==='••••3210','Phone must be masked');
  assert(stored.metadata.password==='[redacted]','Sensitive metadata must be redacted');
  assert(Array.isArray(stored.metadata.changes)&&stored.metadata.changes.some(x=>x.field==='status'),'Before/after change list must be stored');

  const listed=await audit.list({category:'system',action:'system.ci_audit_check',entityType:'ci_entity',search:'CI audit verification',page:1,limit:10});
  assert(listed.items.some(item=>Number(item.id)===Number(row.id)),'Audit list filters must return the inserted record');

  await pool.query("DELETE FROM critical_action_audit WHERE source='ci_critical_audit'");
  console.log('Critical action audit PostgreSQL runtime smoke passed.');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1}).finally(()=>pool.end());
