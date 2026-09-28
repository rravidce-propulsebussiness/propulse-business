const pool=require('../config/database');

const longQuerySeconds=Math.min(300,Math.max(1,Number(process.env.PERFORMANCE_LONG_QUERY_SECONDS)||5));
const idleTransactionSeconds=Math.min(3600,Math.max(10,Number(process.env.PERFORMANCE_IDLE_TX_SECONDS)||60));
const deadTupleWarnPercent=Math.min(90,Math.max(5,Number(process.env.PERFORMANCE_DEAD_TUPLE_WARN_PERCENT)||20));
const deadTupleMinRows=Math.max(100,Math.floor(Number(process.env.PERFORMANCE_DEAD_TUPLE_MIN_ROWS)||1000));
const apiWindowDays=Math.min(30,Math.max(1,Math.floor(Number(process.env.PERFORMANCE_API_WINDOW_DAYS)||7)));

function number(value){const n=Number(value);return Number.isFinite(n)?n:0}
function rounded(value,digits=1){const n=Number(value);return Number.isFinite(n)?Number(n.toFixed(digits)):0}
function ratio(hit,read){
  const h=number(hit),r=number(read),total=h+r;
  return total>0?rounded((h/total)*100,2):100;
}
function sanitizeSql(value){
  return String(value||'')
    .replace(/'(?:''|[^'])*'/g,"'?'")
    .replace(/\b\d+(?:\.\d+)?\b/g,'?')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,320);
}
function poolSnapshot(){
  const max=Math.max(1,Number(pool.options?.max)||5);
  const total=number(pool.totalCount);
  const idle=Math.min(total,number(pool.idleCount));
  const busy=Math.max(0,total-idle);
  const waiting=number(pool.waitingCount);
  return{max,total,idle,busy,waiting,utilizationPercent:Math.min(100,Math.round((busy/max)*100))};
}
async function databaseStats(){
  const row=(await pool.query(
    `SELECT current_database() AS database_name,
            pg_database_size(current_database())::bigint AS size_bytes,
            numbackends::int,
            xact_commit::bigint,xact_rollback::bigint,
            blks_read::bigint,blks_hit::bigint,
            temp_files::bigint,temp_bytes::bigint,
            deadlocks::bigint,
            blk_read_time::double precision,blk_write_time::double precision,
            stats_reset
       FROM pg_stat_database
      WHERE datname=current_database()`
  )).rows[0]||{};
  return{
    name:row.database_name||null,
    sizeBytes:number(row.size_bytes),
    backends:number(row.numbackends),
    cacheHitPercent:ratio(row.blks_hit,row.blks_read),
    transactions:{committed:number(row.xact_commit),rolledBack:number(row.xact_rollback)},
    temp:{files:number(row.temp_files),bytes:number(row.temp_bytes)},
    deadlocks:number(row.deadlocks),
    io:{readMs:rounded(row.blk_read_time,1),writeMs:rounded(row.blk_write_time,1)},
    statsResetAt:row.stats_reset||null
  };
}
async function activityStats(){
  const summary=(await pool.query(
    `SELECT
       COUNT(*) FILTER(WHERE state='active' AND pid<>pg_backend_pid())::int AS active,
       COUNT(*) FILTER(WHERE state='idle')::int AS idle,
       COUNT(*) FILTER(WHERE state='idle in transaction')::int AS idle_in_transaction,
       COUNT(*) FILTER(WHERE wait_event IS NOT NULL AND pid<>pg_backend_pid())::int AS waiting,
       COUNT(*) FILTER(
         WHERE state='active' AND pid<>pg_backend_pid()
           AND query_start<CURRENT_TIMESTAMP-($1*INTERVAL '1 second')
       )::int AS long_running
     FROM pg_stat_activity
     WHERE datname=current_database()`,
    [longQuerySeconds]
  )).rows[0]||{};
  const [longRows,idleTxRows]=await Promise.all([
    pool.query(
      `SELECT pid,usename,application_name,backend_type,state,wait_event_type,wait_event,
              ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-query_start))::numeric,1) AS duration_seconds
         FROM pg_stat_activity
        WHERE datname=current_database()
          AND pid<>pg_backend_pid()
          AND state='active'
          AND query_start<CURRENT_TIMESTAMP-($1*INTERVAL '1 second')
        ORDER BY query_start ASC
        LIMIT 20`,
      [longQuerySeconds]
    ),
    pool.query(
      `SELECT pid,usename,application_name,backend_type,state,wait_event_type,wait_event,
              ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-COALESCE(xact_start,state_change)))::numeric,1) AS duration_seconds
         FROM pg_stat_activity
        WHERE datname=current_database()
          AND pid<>pg_backend_pid()
          AND state='idle in transaction'
          AND COALESCE(xact_start,state_change)<CURRENT_TIMESTAMP-($1*INTERVAL '1 second')
        ORDER BY COALESCE(xact_start,state_change) ASC
        LIMIT 20`,
      [idleTransactionSeconds]
    )
  ]);
  const map=row=>({
    pid:number(row.pid),user:row.usename||null,application:row.application_name||null,
    backendType:row.backend_type||null,state:row.state||null,
    waitType:row.wait_event_type||null,waitEvent:row.wait_event||null,
    durationSeconds:number(row.duration_seconds)
  });
  return{
    active:number(summary.active),idle:number(summary.idle),
    idleInTransaction:number(summary.idle_in_transaction),waiting:number(summary.waiting),
    longRunning:number(summary.long_running),
    longQueries:longRows.rows.map(map),
    idleTransactions:idleTxRows.rows.map(map)
  };
}
async function tableStats(){
  const rows=(await pool.query(
    `SELECT relname,
            pg_total_relation_size(relid)::bigint AS total_bytes,
            pg_relation_size(relid)::bigint AS table_bytes,
            pg_indexes_size(relid)::bigint AS index_bytes,
            n_live_tup::bigint,n_dead_tup::bigint,
            COALESCE(seq_scan,0)::bigint AS seq_scan,
            COALESCE(idx_scan,0)::bigint AS idx_scan,
            CASE WHEN (n_live_tup+n_dead_tup)>0
              THEN ROUND((n_dead_tup::numeric*100)/(n_live_tup+n_dead_tup),1)
              ELSE 0 END AS dead_tuple_percent,
            last_vacuum,last_autovacuum,last_analyze,last_autoanalyze
       FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 20`
  )).rows;
  return rows.map(row=>({
    table:row.relname,
    totalBytes:number(row.total_bytes),tableBytes:number(row.table_bytes),indexBytes:number(row.index_bytes),
    liveRows:number(row.n_live_tup),deadRows:number(row.n_dead_tup),deadTuplePercent:number(row.dead_tuple_percent),
    seqScans:number(row.seq_scan),indexScans:number(row.idx_scan),
    lastVacuumAt:row.last_vacuum||row.last_autovacuum||null,
    lastAnalyzeAt:row.last_analyze||row.last_autoanalyze||null
  }));
}
async function indexStats(){
  const rows=(await pool.query(
    `SELECT s.relname AS table_name,s.indexrelname AS index_name,
            pg_relation_size(s.indexrelid)::bigint AS size_bytes,
            COALESCE(s.idx_scan,0)::bigint AS scans
       FROM pg_stat_user_indexes s
       JOIN pg_index i ON i.indexrelid=s.indexrelid
      WHERE NOT i.indisprimary AND NOT i.indisunique
      ORDER BY pg_relation_size(s.indexrelid) DESC,s.idx_scan ASC
      LIMIT 50`
  )).rows;
  const mapped=rows.map(row=>({
    table:row.table_name,index:row.index_name,sizeBytes:number(row.size_bytes),scans:number(row.scans)
  }));
  return{
    largest:mapped.slice(0,15),
    unusedLarge:mapped.filter(item=>item.scans===0&&item.sizeBytes>=1024*1024).slice(0,12),
    note:'Zero scans only means unused since PostgreSQL statistics were last reset; review workload history before changing or dropping an index.'
  };
}
async function slowApiStats(){
  const rows=(await pool.query(
    `SELECT method,route,
            SUM(occurrence_count)::bigint AS occurrences,
            MAX(duration_ms)::int AS latest_duration_ms,
            MAX(last_seen_at) AS last_seen_at
       FROM operational_events
      WHERE event_type='slow_request'
        AND last_seen_at>=CURRENT_TIMESTAMP-($1*INTERVAL '1 day')
      GROUP BY method,route
      ORDER BY SUM(occurrence_count) DESC,MAX(last_seen_at) DESC
      LIMIT 20`,
    [apiWindowDays]
  )).rows;
  return{
    windowDays:apiWindowDays,
    routes:rows.map(row=>({
      method:row.method||null,route:row.route||null,occurrences:number(row.occurrences),
      latestDurationMs:number(row.latest_duration_ms),lastSeenAt:row.last_seen_at||null
    }))
  };
}
async function statementStats(){
  try{
    const enabled=Boolean((await pool.query(
      `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_stat_statements') AS enabled`
    )).rows[0]?.enabled);
    if(!enabled)return{enabled:false,available:false,reason:'pg_stat_statements is not enabled. Performance Center remains fully usable without it.'};
    const rows=(await pool.query(
      `SELECT queryid::text,calls::bigint,total_exec_time::double precision,
              mean_exec_time::double precision,rows::bigint,query
         FROM pg_stat_statements
        WHERE dbid=(SELECT oid FROM pg_database WHERE datname=current_database())
        ORDER BY total_exec_time DESC
        LIMIT 15`
    )).rows;
    return{
      enabled:true,available:true,
      statements:rows.map(row=>({
        queryId:row.queryid,calls:number(row.calls),totalExecMs:rounded(row.total_exec_time,1),
        meanExecMs:rounded(row.mean_exec_time,2),rows:number(row.rows),querySample:sanitizeSql(row.query)
      }))
    };
  }catch(error){
    return{enabled:true,available:false,reason:String(error?.message||'pg_stat_statements is not readable').slice(0,240)};
  }
}
async function optional(name,promise,fallback){
  try{return await promise}catch(error){return{...fallback,unavailable:true,error:String(error?.message||name+' unavailable').slice(0,240)}}
}
function performanceSignals({database,activity,tables,slowApis,poolState}){
  const signals=[];
  const push=(severity,code,title,message)=>signals.push({severity,code,title,message});
  if(poolState.waiting>0)push('attention','pool_waiting','Database pool has waiting requests',`${poolState.waiting} request(s) are waiting for a PostgreSQL connection.`);
  else if(poolState.utilizationPercent>=80)push('attention','pool_high_utilization','Database pool utilization is high',`${poolState.utilizationPercent}% of the configured pool is actively busy.`);
  if(!activity.unavailable&&activity.longRunning>0)push('attention','long_queries','Long-running queries detected',`${activity.longRunning} active quer${activity.longRunning===1?'y':'ies'} exceed the ${longQuerySeconds}s threshold.`);
  if(!activity.unavailable&&activity.idleTransactions?.length>0)push('attention','idle_transactions','Idle transactions detected',`${activity.idleTransactions.length} transaction(s) have remained idle longer than ${idleTransactionSeconds}s.`);
  if(!database.unavailable&&database.cacheHitPercent<95&&(number(database.transactions?.committed)+number(database.transactions?.rolledBack))>1000)push('attention','cache_hit','Database cache hit ratio is low',`Current PostgreSQL block cache hit ratio is ${database.cacheHitPercent}%.`);
  if(!database.unavailable&&database.deadlocks>0)push('attention','deadlocks','PostgreSQL has recorded deadlocks',`${database.deadlocks} deadlock(s) have been recorded since statistics were reset.`);
  const bloated=(Array.isArray(tables)?tables:[]).filter(item=>item.deadRows>=deadTupleMinRows&&item.deadTuplePercent>=deadTupleWarnPercent);
  if(bloated.length)push('attention','dead_tuples','Tables may need vacuum attention',`${bloated.length} table(s) exceed ${deadTupleWarnPercent}% dead tuples with at least ${deadTupleMinRows} dead rows.`);
  const recentSlow=(slowApis?.routes||[]).filter(item=>item.lastSeenAt&&Date.now()-new Date(item.lastSeenAt).getTime()<=60*60*1000);
  if(recentSlow.length)push('attention','recent_slow_api','Slow API activity detected recently',`${recentSlow.length} route(s) recorded a slow request in the last hour.`);
  return signals;
}
async function getPerformanceOverview(){
  const poolState=poolSnapshot();
  const [database,activity,tables,indexes,slowApis,statements]=await Promise.all([
    optional('database statistics',databaseStats(),{}),
    optional('activity statistics',activityStats(),{longQueries:[],idleTransactions:[],active:0,idle:0,idleInTransaction:0,waiting:0,longRunning:0}),
    optional('table statistics',tableStats(),[]),
    optional('index statistics',indexStats(),{largest:[],unusedLarge:[],note:null}),
    optional('slow API statistics',slowApiStats(),{windowDays:apiWindowDays,routes:[]}),
    statementStats()
  ]);
  const signals=performanceSignals({database,activity,tables,slowApis,poolState});
  return{
    status:signals.length?'attention':'healthy',
    checkedAt:new Date().toISOString(),
    thresholds:{longQuerySeconds,idleTransactionSeconds,deadTupleWarnPercent,deadTupleMinRows,apiWindowDays},
    signals,
    pool:poolState,
    database,
    activity,
    tables:Array.isArray(tables)?tables:[],
    indexes,
    slowApis,
    statements
  };
}

module.exports={getPerformanceOverview,sanitizeSql,poolSnapshot,databaseStats,activityStats,tableStats,indexStats,slowApiStats,statementStats,performanceSignals};
