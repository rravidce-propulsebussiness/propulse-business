const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const worker=read('src/worker.js');
const server=read('src/server.js');
const heartbeat=read('src/services/backgroundWorkerHeartbeatService.js');
const migration=read('src/database/migrations/20260928_background_worker_heartbeats.sql');
const env=read('scripts/check-production-env.js');

assert(migration.includes('CREATE TABLE IF NOT EXISTS background_worker_heartbeats'),'Worker heartbeat migration must exist');
assert(heartbeat.includes("const WORKER_NAME='sheet-sync'"),'Heartbeat must identify the sheet-sync worker');
assert(heartbeat.includes("status='running'"),'Worker heartbeat must mark live instances');
assert(heartbeat.includes("status='stopped'"),'Graceful worker shutdown must mark its instance stopped');
assert(worker.includes('await workerHeartbeat.beat()'),'Worker startup must fail fast if heartbeat persistence is unavailable');
assert(worker.includes('await stopHeartbeat()'),'Worker shutdown must flush its stopped heartbeat before closing PostgreSQL');
assert(server.includes("app.get('/health/worker'"),'Web service must expose worker health');
assert(server.includes("envFlag('REQUIRE_BACKGROUND_WORKER',false)"),'Worker readiness enforcement must be opt-in');
assert(server.includes("if(shuttingDown)return res.status(503).json({status:'draining'"),'Readiness must fail immediately while the web process drains');
assert(server.includes("workerAgeSeconds<=workerHeartbeatMaxAgeSeconds"),'Required worker readiness must enforce heartbeat freshness');
assert(env.includes("REQUIRE_BACKGROUND_WORKER=true requires RUN_BACKGROUND_JOBS_IN_WEB=false"),'Production preflight must reject contradictory worker topology');
assert(env.includes("Dedicated background jobs are configured but REQUIRE_BACKGROUND_WORKER is false"),'Production preflight must warn when worker death is invisible to readiness');
console.log('Background worker health/readiness regression test passed.');
