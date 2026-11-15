const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const server=read('src/server.js');
const intervalScheduler=read('src/services/intervalSchedulerService.js');
const worker=read('src/worker.js');
const runtimeFlags=read('src/config/runtimeFlags.js');
const rateLimitConfig=read('src/config/apiRateLimitConfig.js');
const registry=read('src/services/backgroundJobRegistryService.js');
const pkg=JSON.parse(read('package.json'));

assert(rateLimitConfig.includes('shared:Boolean(isProduction)'),'Global production API limiter must use the shared PostgreSQL bucket');
assert(rateLimitConfig.includes('const defaultMax=isProduction?600:10000'),'Global API limiter must preserve the strict production default');
assert(!rateLimitConfig.includes('shared:false')||rateLimitConfig.includes('shared:Boolean(isProduction)'),'Global API limiter must not be hard-coded instance-local in production');
assert(server.includes("envFlag('RUN_MIGRATIONS_ON_STARTUP',true)"),'Web migration startup must be explicitly configurable');
assert(server.includes("envFlag('RUN_BACKGROUND_JOBS_IN_WEB',true)"),'Web background jobs must be explicitly configurable');
assert(server.includes('if(runMigrationsOnStartup)await runMigrations()'),'Web process must honor migration startup control');
assert(server.includes('if(runBackgroundJobsInWeb){'),'Web process must honor background-job control');
assert(runtimeFlags.includes("['0', 'false', 'no', 'off']"),'Runtime flag parser must support explicit false values');
assert(intervalScheduler.includes('unref=true')&&intervalScheduler.includes('runImmediately=false'),'Recurring jobs must support web and worker modes');
assert(intervalScheduler.includes("if(runImmediately)void runScheduled(name,run,{source:'startup'})"),'Dedicated worker must label immediate runs as startup');
assert(intervalScheduler.includes('if(unref)timer.unref?.()'),'Web scheduler timer must remain non-blocking');
assert(!server.includes('adminGoogleSheetSyncScheduler')&&!server.includes('leadPartnerSheetSyncScheduler'),'Web process must not import deleted Sheets schedulers');
assert(!worker.includes('adminGoogleSheetSyncScheduler')&&!worker.includes('leadPartnerSheetSyncScheduler'),'Worker must not import deleted Sheets schedulers');
assert(!registry.includes('admin_google_sheet_sync')&&!registry.includes('lead_partner_google_sheet_sync'),'Background-job registry must not expose deleted Sheets jobs');
assert(worker.includes('RUN_MIGRATIONS_ON_WORKER_STARTUP'),'Worker migration behavior must be explicit');
assert(pkg.scripts.worker==='node src/worker.js','Backend must expose a supervised worker command');

const readyPosition=server.indexOf('startupReady=true');
const prunePosition=server.indexOf('operationalMonitoringService.pruneResolved()');
assert(readyPosition>=0&&prunePosition>readyPosition,'Operational-event retention cleanup must run after API startup readiness');
assert(server.includes('void operationalMonitoringService.pruneResolved()'),'Retention cleanup must be non-blocking during web startup');

console.log('Runtime deployment separation regression test passed.');
