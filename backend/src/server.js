require('dotenv').config();
const express=require('express');
const crypto=require('crypto');
const cors=require('cors');
const pool=require('./config/database');
const {runMigrations}=require('./database/runMigrations');
const industryRoutes=require('./routes/industryRoutes');
const serviceRoutes=require('./routes/serviceRoutes');
const subserviceRoutes=require('./routes/subserviceRoutes');
const stateRoutes=require('./routes/stateRoutes');
const cityRoutes=require('./routes/cityRoutes');
const subcityRoutes=require('./routes/subcityRoutes');
const pincodeRoutes=require('./routes/pincodeRoutes');
const customerFlowRoutes=require('./routes/customerFlowRoutes');
const authRoutes=require('./routes/authRoutes');
const profileRoutes=require('./routes/profileRoutes');
const adminRoutes=require('./routes/adminRoutes');
const leadRoutes=require('./routes/leadRoutes');
const paymentRoutes=require('./routes/paymentRoutes');
const paymentReceivingDetailsRoutes=require('./routes/paymentReceivingDetailsRoutes');
const couponRoutes=require('./routes/couponRoutes');
const membershipPlanRoutes=require('./routes/membershipPlanRoutes');
const adminCommercialRoutes=require('./routes/adminCommercialRoutes');
const walletRoutes=require('./routes/walletRoutes');
const investmentRoutes=require('./routes/investmentRoutes');
const investorPayoutAccountRoutes=require('./routes/investorPayoutAccountRoutes');
const leadPartnerRoutes=require('./routes/leadPartnerRoutes');
const leadReportRoutes=require('./routes/leadReportRoutes');
const faqRoutes=require('./routes/faqRoutes');const upcomingFeatureRoutes=require('./routes/upcomingFeatureRoutes');const publicFaqRoutes=require('./routes/publicFaqRoutes');const publicExpertRoutes=require('./routes/publicExpertRoutes');
const homepageMediaRoutes=require('./routes/homepageMediaRoutes');
const contactRoutes=require('./routes/contactRoutes');
const notificationRoutes=require('./routes/notificationRoutes');
const soundSettingsRoutes=require('./routes/soundSettingsRoutes');
const supportChatRoutes=require('./routes/supportChatRoutes');
const paymentWebhookRoutes=require('./routes/paymentWebhookRoutes');
const observabilityRoutes=require('./routes/observabilityRoutes');
const adminFaqRoutes=require('./routes/adminFaqRoutes');
const { startLeadPartnerSheetAutoSync }=require('./services/leadPartnerSheetSyncScheduler');
const { startAdminGoogleSheetAutoSync }=require('./services/adminGoogleSheetSyncScheduler');
const { startFinancialReconciliationScheduler }=require('./services/financialReconciliationScheduler');
const { startNotificationScheduler }=require('./services/notificationScheduler');
const rateLimit=require('./middleware/rateLimitMiddleware');
const csrfProtection=require('./middleware/csrfMiddleware');
const {getConfiguredOrigins}=require('./config/httpOrigins');
const {envFlag}=require('./config/runtimeFlags');
const {uploadRoot,checkUploadStorage,ensureUploadStorage}=require('./config/uploadStorage');
const workerHeartbeat=require('./services/backgroundWorkerHeartbeatService');
const operationalMonitoringService=require('./services/operationalMonitoringService');
const releaseIdentity=require('./services/releaseIdentityService');
const app=express();
const isProduction=process.env.NODE_ENV==='production';
const PORT=Number(process.env.PORT)||5000;
const configuredOrigins=getConfiguredOrigins({isProduction});
const DEFAULT_JSON_BYTES='1mb';
const LARGE_JSON_BYTES='9mb';
const healthCheckTimeoutMs=Math.min(10000,Math.max(500,Number(process.env.HEALTH_CHECK_TIMEOUT_MS)||2500));
const httpRequestTimeoutMs=Math.min(300000,Math.max(5000,Number(process.env.HTTP_REQUEST_TIMEOUT_MS)||60000));
const httpHeadersTimeoutMs=Math.min(httpRequestTimeoutMs,Math.max(5000,Number(process.env.HTTP_HEADERS_TIMEOUT_MS)||15000));
const httpKeepAliveTimeoutMs=Math.min(60000,Math.max(1000,Number(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS)||5000));
const httpMaxRequestsPerSocket=Math.min(10000,Math.max(1,Math.floor(Number(process.env.HTTP_MAX_REQUESTS_PER_SOCKET)||1000)));
const slowRequestMs=Math.min(60000,Math.max(250,Number(process.env.SLOW_REQUEST_MS)||2000));
const operationalMonitoringEnabled=envFlag('OPERATIONAL_MONITORING_ENABLED',true);
const runMigrationsOnStartup=envFlag('RUN_MIGRATIONS_ON_STARTUP',true);
const runBackgroundJobsInWeb=envFlag('RUN_BACKGROUND_JOBS_IN_WEB',true);
const requireBackgroundWorker=envFlag('REQUIRE_BACKGROUND_WORKER',false);
const workerHeartbeatMaxAgeSeconds=Math.min(600,Math.max(30,Math.floor(Number(process.env.WORKER_HEARTBEAT_MAX_AGE_SECONDS)||120)));
const trustProxy=String(process.env.TRUST_PROXY||'').trim();
if(trustProxy) app.set('trust proxy',trustProxy==='false'?false:trustProxy==='true'?true:Number.isNaN(Number(trustProxy))?trustProxy:Number(trustProxy));
app.disable('x-powered-by');
app.use((req,res,next)=>{
  const incoming=String(req.get('x-request-id')||'').trim();
  req.requestId=/^[A-Za-z0-9._:-]{1,100}$/.test(incoming)?incoming:crypto.randomUUID();
  res.setHeader('X-Request-Id',req.requestId);
  next();
});
app.use((req,res,next)=>{
  if(!isProduction)return next();
  const started=process.hrtime.bigint();
  res.once('finish',()=>{
    const durationMs=Number(process.hrtime.bigint()-started)/1e6;
    if(res.statusCode>=500||durationMs>=slowRequestMs){
      const level=res.statusCode>=500?'error':'warn';
      console[level](`[${req.requestId}] ${req.method} ${req.path} -> ${res.statusCode} in ${durationMs.toFixed(1)}ms`);
    }
  });
  next();
});
app.use((req,res,next)=>{
  if(!operationalMonitoringEnabled)return next();
  const started=process.hrtime.bigint();
  res.once('finish',()=>{
    const durationMs=Number(process.hrtime.bigint()-started)/1e6;
    if(res.statusCode>=500||durationMs>=slowRequestMs){
      operationalMonitoringService.recordHttpRequest({
        req,res,durationMs,error:res.locals?.operationalError||null,slowRequestMs
      }).catch(error=>console.error(`[${req.requestId}] Operational request capture failed:`,error?.message||error));
    }
  });
  next();
});
app.use(cors({origin(origin,callback){if(!origin||configuredOrigins.includes(origin))return callback(null,true);return callback(new Error('CORS origin not allowed'));},credentials:true}));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Permissions-Policy','camera=(),microphone=(),geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'");if(isProduction)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');next();});
app.use('/api/payment-webhooks/razorpay',express.raw({type:'application/json',limit:'256kb'}),paymentWebhookRoutes);
const largeJsonParser=express.json({limit:LARGE_JSON_BYTES});
const largeJsonFor=method=>(req,res,next)=>req.method===method?largeJsonParser(req,res,next):next();
app.use('/api/auth/company-proofs',largeJsonFor('POST'));
app.use('/api/payments/:id/reference',largeJsonFor('POST'));
app.use('/api/wallet/topups',largeJsonFor('POST'));
app.use('/api/investments/admin/transfer-requests/:id/process',largeJsonFor('POST'));
app.use('/api/investments/admin/:id/payout',largeJsonFor('POST'));
app.use('/api/admin/lead-partner-payouts/direct',largeJsonFor('POST'));
app.use('/api/admin/lead-partner-payouts/:payoutId',largeJsonFor('PATCH'));
app.use('/api/admin/homepage-media',largeJsonFor('POST'));
app.use('/api/profile/projects/video',express.raw({type:['video/mp4','video/webm','video/quicktime'],limit:'51mb'}));
app.use('/api/profile/projects/plan',express.raw({type:['application/pdf','image/jpeg','image/png','image/webp'],limit:'16mb'}));
app.use('/api/customer-flows/:key/:leadId/attachments',largeJsonFor('POST'));
app.use('/api/customer-flows',express.json({limit:'64kb'}));
app.use(express.json({limit:DEFAULT_JSON_BYTES}));
app.use('/api',(req,res,next)=>{res.setHeader('Cache-Control','no-store, private');res.setHeader('Pragma','no-cache');res.setHeader('Expires','0');next();});
app.use('/api',csrfProtection);
const apiRateLimit=rateLimit({windowMs:15*60*1000,max:600,scope:'global',shared:true,sharedChunkSize:10});
app.use('/api',apiRateLimit);
app.use('/api/sound-settings',soundSettingsRoutes);
app.use('/api/support-chat',supportChatRoutes);
app.use('/uploads',(req,res,next)=>{if(req.path==='/company-proofs'||req.path.startsWith('/company-proofs/'))return res.status(404).json({error:'Not found'});if(req.path==='/private-proofs'||req.path.startsWith('/private-proofs/'))return res.status(404).json({error:'Not found'});if(req.path==='/lead-references'||req.path.startsWith('/lead-references/'))return res.status(404).json({error:'Not found'});return next();});
app.use('/uploads',express.static(uploadRoot,{fallthrough:true,maxAge:'7d',immutable:true}));
function setHealthHeaders(res){res.setHeader('Cache-Control','no-store');}
function withTimeout(promise,label){
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label} readiness check timed out`)),healthCheckTimeoutMs);timer.unref?.();})
  ]).finally(()=>clearTimeout(timer));
}
app.get('/health/live',(req,res)=>{setHealthHeaders(res);res.json({status:'ok'});});
app.get('/health/version',(req,res)=>{setHealthHeaders(res);res.json({status:'ok',...releaseIdentity.snapshot()});});
app.get('/health/worker',async(req,res)=>{
  setHealthHeaders(res);
  try{
    const heartbeat=await withTimeout(workerHeartbeat.latestHeartbeat(),'Background worker');
    const ageSeconds=heartbeat?Number(heartbeat.age_seconds):null;
    const fresh=Boolean(heartbeat)&&Number.isFinite(ageSeconds)&&ageSeconds<=workerHeartbeatMaxAgeSeconds;
    return res.status(fresh?200:503).json({status:fresh?'ok':'error',worker:fresh?'fresh':'unavailable',ageSeconds});
  }catch(error){
    console.error(`[${req.requestId}] Worker health check failed:`,error?.message||error);
    return res.status(503).json({status:'error',worker:'unavailable'});
  }
});
async function readiness(req,res){
  setHealthHeaders(res);
  if(shuttingDown)return res.status(503).json({status:'draining',database:'unknown',storage:'unknown',worker:requireBackgroundWorker?'unknown':'not-required'});
  const [database,storage,worker]=await Promise.allSettled([
    withTimeout(pool.query('SELECT 1'),'Database'),
    withTimeout(checkUploadStorage(),'Upload storage'),
    requireBackgroundWorker?withTimeout(workerHeartbeat.latestHeartbeat(),'Background worker'):Promise.resolve(null)
  ]);
  const databaseReady=database.status==='fulfilled';
  const storageReady=storage.status==='fulfilled';
  const heartbeat=worker.status==='fulfilled'?worker.value:null;
  const workerAgeSeconds=heartbeat?Number(heartbeat.age_seconds):null;
  const workerReady=!requireBackgroundWorker||(Boolean(heartbeat)&&Number.isFinite(workerAgeSeconds)&&workerAgeSeconds<=workerHeartbeatMaxAgeSeconds);
  if(databaseReady&&storageReady&&workerReady)return res.json({status:'ok',database:'connected',storage:'ready',worker:requireBackgroundWorker?'fresh':'not-required'});
  if(!databaseReady)console.error(`[${req.requestId}] Readiness database check failed:`,database.reason?.message||database.reason);
  if(!storageReady)console.error(`[${req.requestId}] Readiness storage check failed:`,storage.reason?.message||storage.reason);
  if(requireBackgroundWorker&&!workerReady)console.error(`[${req.requestId}] Readiness worker check failed: latest heartbeat age=${workerAgeSeconds??'missing'}s`);
  return res.status(503).json({
    status:'error',
    database:databaseReady?'connected':'unavailable',
    storage:storageReady?'ready':'unavailable',
    worker:requireBackgroundWorker?(workerReady?'fresh':'unavailable'):'not-required'
  });
}
app.get('/health/ready',readiness);
app.get('/health',readiness);
app.use('/api/observability',observabilityRoutes);app.use('/api/customer-flows',customerFlowRoutes);app.use('/api/auth',authRoutes);app.use('/api/notifications',notificationRoutes);app.use('/api/profile',profileRoutes);app.use('/api/admin',adminRoutes);app.use('/api/lead-partner',leadPartnerRoutes);app.use('/api/lead-reports',leadReportRoutes);app.use('/api/lead-partner/faqs',faqRoutes);app.use('/api/faqs',publicFaqRoutes);app.use('/api/experts',publicExpertRoutes);app.use('/api/upcoming-features',upcomingFeatureRoutes);app.use('/api/contact',contactRoutes);app.use('/api/homepage-media',homepageMediaRoutes);app.use('/api/admin/faqs',adminFaqRoutes);app.use('/api/leads',leadRoutes);app.use('/api/payments',paymentRoutes);app.use('/api/payment-receiving-details',paymentReceivingDetailsRoutes);app.use('/api/coupons',couponRoutes);app.use('/api/membership-plans',membershipPlanRoutes);app.use('/api/admin/commercial',adminCommercialRoutes);app.use('/api/wallet',walletRoutes);app.use('/api/investments',investmentRoutes);app.use('/api/investor/payout-account',investorPayoutAccountRoutes);app.use('/api/industries',industryRoutes);app.use('/api/services',serviceRoutes);app.use('/api/subservices',subserviceRoutes);app.use('/api/states',stateRoutes);app.use('/api/cities',cityRoutes);app.use('/api/subcities',subcityRoutes);app.use('/api/pincodes',pincodeRoutes);
app.use((req,res)=>res.status(404).json({error:'Not found'}));
app.use((err,req,res,next)=>{if(err.message==='CORS origin not allowed')return res.status(403).json({error:'Origin not allowed'});if(err.type==='entity.parse.failed')return res.status(400).json({error:'Invalid JSON body'});if(err.type==='entity.too.large')return res.status(413).json({error:'Request body is too large'});res.locals.operationalError=err;console.error(`[${req.requestId||'no-request-id'}] Unhandled server error:`,err.stack||err);return res.status(500).json({error:'Internal server error',requestId:req.requestId||undefined});});
let server;let stopLeadPartnerSheetAutoSync=()=>{};let stopAdminGoogleSheetAutoSync=()=>{};let stopFinancialReconciliation=async()=>{};let stopNotifications=async()=>{};let shuttingDown=false;
async function shutdown(signal,exitCode=0){
  if(shuttingDown)return;
  shuttingDown=true;
  console.log(`${signal} received; shutting down gracefully.`);
  const forceTimer=setTimeout(()=>{console.error('Graceful shutdown timed out; forcing exit.');process.exit(1);},10000);
  forceTimer.unref?.();
  try{
    stopLeadPartnerSheetAutoSync();
    stopAdminGoogleSheetAutoSync();
    await stopFinancialReconciliation();
    await stopNotifications();
    if(server?.listening){
      await new Promise((resolve,reject)=>server.close(error=>{
        if(!error||error.code==='ERR_SERVER_NOT_RUNNING')return resolve();
        return reject(error);
      }));
      server.closeIdleConnections?.();
    }
    await pool.end();
    clearTimeout(forceTimer);
    process.exit(exitCode);
  }catch(error){
    clearTimeout(forceTimer);
    console.error('Graceful shutdown failed:',error?.stack||error);
    process.exit(1);
  }
}
async function recordFatalProcessError(kind,error){
  if(!operationalMonitoringEnabled)return;
  const capture=operationalMonitoringService.recordEvent({
    source:'backend',
    eventType:kind,
    severity:'error',
    message:error?.message||String(error||kind),
    stack:error?.stack||null,
    metadata:{fatal:true}
  }).catch(()=>{});
  await Promise.race([capture,new Promise(resolve=>setTimeout(resolve,750))]);
}
async function start(){
  try{
    await ensureUploadStorage();
    if(runMigrationsOnStartup)await runMigrations();
    else console.log('Database migrations skipped on web startup (RUN_MIGRATIONS_ON_STARTUP=false).');
    if(operationalMonitoringEnabled)await operationalMonitoringService.pruneResolved().catch(error=>console.error('Operational-event retention cleanup failed:',error.message));
    server=app.listen(PORT,'0.0.0.0',()=>{
      console.log(`Server running on port ${PORT}`);
      if(runBackgroundJobsInWeb){
        stopLeadPartnerSheetAutoSync=startLeadPartnerSheetAutoSync();
        stopAdminGoogleSheetAutoSync=startAdminGoogleSheetAutoSync();
        stopFinancialReconciliation=startFinancialReconciliationScheduler({runImmediately:true});
        stopNotifications=startNotificationScheduler({runImmediately:true});
      }else console.log('Background jobs disabled in web process (RUN_BACKGROUND_JOBS_IN_WEB=false).');
    });
    server.requestTimeout=httpRequestTimeoutMs;
    server.headersTimeout=httpHeadersTimeoutMs;
    server.keepAliveTimeout=httpKeepAliveTimeoutMs;
    server.maxRequestsPerSocket=httpMaxRequestsPerSocket;
    server.maxHeadersCount=100;
    process.once('SIGTERM',()=>shutdown('SIGTERM'));
    process.once('SIGINT',()=>shutdown('SIGINT'));
    process.once('uncaughtException',error=>{console.error('Uncaught exception:',error?.stack||error);void recordFatalProcessError('uncaught_exception',error).finally(()=>shutdown('uncaughtException',1));});
    process.once('unhandledRejection',reason=>{console.error('Unhandled rejection:',reason?.stack||reason);void recordFatalProcessError('unhandled_rejection',reason).finally(()=>shutdown('unhandledRejection',1));});
  }catch(error){
    console.error('Backend startup failed:');
    console.error(error?.stack||error||'Unknown error');
    await recordFatalProcessError('startup_failure',error).catch(()=>{});
    await pool.end();
    process.exitCode=1;
  }
}
start();
