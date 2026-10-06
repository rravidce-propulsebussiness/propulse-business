require('dotenv').config();
const express=require('express');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
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
const seoRoutes=require('./routes/seoRoutes');
const paymentWebhookRoutes=require('./routes/paymentWebhookRoutes');
const observabilityRoutes=require('./routes/observabilityRoutes');
const adminFaqRoutes=require('./routes/adminFaqRoutes');
const { startLeadPartnerSheetAutoSync }=require('./services/leadPartnerSheetSyncScheduler');
const { startAdminGoogleSheetAutoSync }=require('./services/adminGoogleSheetSyncScheduler');
const { startFinancialReconciliationScheduler }=require('./services/financialReconciliationScheduler');
const { startNotificationScheduler }=require('./services/notificationScheduler');
const { startPrivateStorageBackupScheduler }=require('./services/privateStorageBackupScheduler');
const { startDatabaseBackupScheduler }=require('./services/databaseBackupScheduler');
const rateLimit=require('./middleware/rateLimitMiddleware');
const {getApiGlobalRateLimitConfig}=require('./config/apiRateLimitConfig');
const csrfProtection=require('./middleware/csrfMiddleware');
const {getConfiguredOrigins}=require('./config/httpOrigins');
const {envFlag}=require('./config/runtimeFlags');
const {uploadRoot,checkUploadStorage,ensureUploadStorage}=require('./config/uploadStorage');
const workerHeartbeat=require('./services/backgroundWorkerHeartbeatService');
const operationalMonitoringService=require('./services/operationalMonitoringService');
const releaseIdentity=require('./services/releaseIdentityService');
const {migrateLegacyCompanyProofsToObjectStorage}=require('./services/legacyUploadMigrationService');
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
const startupRetryMs=Math.min(300000,Math.max(5000,Number(process.env.STARTUP_RETRY_MS)||30000));
const operationalMonitoringEnabled=envFlag('OPERATIONAL_MONITORING_ENABLED',true);
const runMigrationsOnStartup=envFlag('RUN_MIGRATIONS_ON_STARTUP',true);
const serveFrontendFromBackend=envFlag('SERVE_FRONTEND_FROM_BACKEND',false);
const bundledFrontendDist=path.resolve(__dirname,'../hostinger-frontend');
const sourceFrontendDist=path.resolve(__dirname,'../../frontend/dist');
const bundledFrontendIndex=path.join(bundledFrontendDist,'index.html');
const sourceFrontendIndex=path.join(sourceFrontendDist,'index.html');
const frontendDist=fs.existsSync(bundledFrontendIndex)?bundledFrontendDist:sourceFrontendDist;
const frontendIndexPath=fs.existsSync(bundledFrontendIndex)?bundledFrontendIndex:sourceFrontendIndex;
const runBackgroundJobsInWeb=envFlag('RUN_BACKGROUND_JOBS_IN_WEB',true);
const requireBackgroundWorker=envFlag('REQUIRE_BACKGROUND_WORKER',false);
const workerHeartbeatMaxAgeSeconds=Math.min(600,Math.max(30,Math.floor(Number(process.env.WORKER_HEARTBEAT_MAX_AGE_SECONDS)||120)));
const trustProxy=String(process.env.TRUST_PROXY||'').trim();
const backendOnlyPath=requestPath=>requestPath==='/robots.txt'||requestPath==='/sitemap.xml'||requestPath==='/release.json'||requestPath==='/health'||requestPath.startsWith('/health/')||requestPath.startsWith('/api')||requestPath.startsWith('/uploads');
const privateFrontendPath=requestPath=>/^\/(admin|login|signup|forgot-password|reset-password|profile|wallet|membership|notifications|purchased-leads|my-leads|investment|lead-partner|requirements|estimate|professional-contact|professionals|upcoming-features|dashboard)(\/|$)/.test(requestPath);
const publicSpaFrontendPaths=new Set(['/','/quote','/solutions','/experts','/packages','/projects','/how-it-works','/about','/contact','/faq','/hyderabad','/guides','/interior-estimator','/interior-cost-estimator','/construction-estimator','/construction-cost-estimator']);
const publicDynamicFrontendPath=requestPath=>/^\/hyderabad\/[a-z0-9-]+(?:\/(?:compare-options|[a-z0-9-]+))?$/.test(requestPath)||/^\/guides\/[a-z0-9-]+$/.test(requestPath)||/^\/[a-z0-9-]+\/construction(?:\/[a-z0-9-]+)?$/.test(requestPath);
const knownSpaFrontendPath=requestPath=>privateFrontendPath(requestPath)||publicSpaFrontendPaths.has(requestPath)||publicDynamicFrontendPath(requestPath);
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
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Permissions-Policy','camera=(),microphone=(),geolocation=()');if(!backendOnlyPath(req.path))res.setHeader('Cross-Origin-Opener-Policy','same-origin-allow-popups');if(backendOnlyPath(req.path))res.setHeader('Content-Security-Policy',"default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'");if(isProduction)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');next();});
app.get('/favicon.ico',(req,res)=>res.redirect(308,'/favicon.svg'));
app.use('/',seoRoutes);
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
app.use('/api',(req,res,next)=>{
  if(startupReady)return next();
  const degradedGet=req.method==='GET';
  if(degradedGet)res.setHeader('X-Backend-Degraded','true');

  if(degradedGet&&req.path==='/auth/session')return res.json({authenticated:false,user:null,degraded:true});
  if(degradedGet&&req.path==='/sound-settings')return res.json({
    masterEnabled:true,clickEnabled:true,successEnabled:true,warningEnabled:true,
    uploadEnabled:true,notificationEnabled:true,defaultVolume:0.2,degraded:true
  });
  if(degradedGet&&req.path==='/contact'){
    const requestedAudience=String(req.query?.audience||'website').trim().toLowerCase();
    const audience=['website','users','professionals','lead_partners','common'].includes(requestedAudience)?requestedAudience:'website';
    return res.json({audience,company_name:'',email:'',phone:'',whatsapp:'',address:'',business_hours:'',support_email:'',careers_email:'',maps_url:'',website_url:'/',social_handles:[],updated_at:null,degraded:true});
  }
  if(degradedGet&&req.path==='/cities')return res.json({data:[],pagination:{page:1,pageSize:0,total:0,totalPages:0,hasNextPage:false,hasPreviousPage:false},degraded:true});
  if(degradedGet&&req.path==='/homepage-media')return res.json({hero_image_url:'',category_images:{},updated_at:null,degraded:true});
  if(degradedGet&&req.path==='/support-chat/config')return res.json({enabled:false,allowGuests:false,widgetTitle:'Chat with us',greeting:'Hi! How can we help you today?',offlineMessage:'Support is temporarily unavailable. Please try again shortly.',pollSeconds:4,degraded:true});
  if(degradedGet&&req.path==='/faqs')return res.json([]);
  if(degradedGet&&req.path==='/industries')return res.json([]);
  if(degradedGet&&/^\/customer-flows\/(build|design|property)$/.test(req.path)){
    const key=req.path.split('/').pop();
    return res.json({key,unavailable:true,degraded:true,message:'This requirement form is temporarily unavailable while the service reconnects.'});
  }
  if(degradedGet&&req.path==='/leads')return res.json({items:[],pagination:{page:1,limit:20,total:0,hasNext:false,hasPrevious:false},degraded:true,unavailable:true,message:'Lead marketplace is temporarily unavailable while the service reconnects.'});
  return next();
});
app.use('/api',csrfProtection);
const apiGlobalRateLimitConfig=getApiGlobalRateLimitConfig({isProduction});
const independentlyProtectedAuthPaths=new Set(['/auth/forgot-password','/auth/reset-password']);
const apiRateLimit=rateLimit({
  ...apiGlobalRateLimitConfig,
  scope:'global',
  skip:req=>independentlyProtectedAuthPaths.has(req.path),
});
app.use('/api',apiRateLimit);
app.use('/api',(req,res,next)=>{
  if(startupReady)return next();
  res.locals.expectedOperationalTransition='backend_starting';
  res.setHeader('Retry-After',String(Math.max(1,Math.ceil(startupRetryMs/1000))));
  return res.status(503).json({
    error:'Backend dependencies are starting',
    code:'BACKEND_NOT_READY',
    requestId:req.requestId
  });
});
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
app.get('/release.json',(req,res)=>{
  setHealthHeaders(res);
  const markerPath=path.join(frontendDist,'release.json');
  if(!fs.existsSync(markerPath)){
    res.locals.expectedOperationalTransition='frontend_release_starting';
    return res.status(503).json({error:'Frontend release marker unavailable',...releaseIdentity.snapshot()});
  }
  return res.sendFile(markerPath,error=>error?res.status(503).json({error:'Frontend release marker unavailable',...releaseIdentity.snapshot()}):undefined);
});
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
  if(shuttingDown){
    res.locals.expectedOperationalTransition='draining';
    return res.status(503).json({status:'draining',database:'unknown',storage:'unknown',worker:requireBackgroundWorker?'unknown':'not-required'});
  }
  if(!startupReady){
    res.locals.expectedOperationalTransition='backend_starting';
    return res.status(503).json({status:'starting',database:'unknown',storage:'unknown',worker:requireBackgroundWorker?'unknown':'not-required',startup:'initializing'});
  }
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
function serveExactPrerenderedHtml(root){
  return(req,res,next)=>{
    if(!['GET','HEAD'].includes(req.method))return next();
    const accept=String(req.get('accept')||'');
    if(accept&&!accept.includes('text/html')&&!accept.includes('*/*'))return next();
    const requestPath=String(req.path||'');
    if(requestPath==='/'||privateFrontendPath(requestPath)||!knownSpaFrontendPath(requestPath))return next();
    const relative=requestPath.replace(/^\/+/,'');
    if(!relative||relative.split('/').some(part=>part==='.'||part==='..'))return next();
    const candidate=path.join(root,relative+'.html');
    try{
      if(!fs.existsSync(candidate)||!fs.statSync(candidate).isFile())return next();
    }catch{return next()}
    res.setHeader('Cache-Control','no-cache');
    return res.sendFile(candidate,error=>error?next(error):undefined);
  };
}
if(serveFrontendFromBackend){
  const redirectLegacyFrontend=(target,hash='')=>(req,res)=>{
    const queryIndex=req.originalUrl.indexOf('?');
    const query=queryIndex>=0?req.originalUrl.slice(queryIndex):'';
    return res.redirect(301,target+query+hash);
  };
  for(const [from,target,hash] of [
    ['/home','/',''],
    ['/leads','/professionals',''],
    ['/build','/quote','#construction'],
    ['/design','/quote','#interiors'],
    ['/property','/quote','#property'],
    ['/real-estate','/quote','#property'],
    ['/pricing','/','#pricing'],
    ['/industries','/',''],
  ])app.get(from,redirectLegacyFrontend(target,hash));
  app.use(serveExactPrerenderedHtml(frontendDist));
  app.use(express.static(frontendDist,{index:'index.html',extensions:['html'],fallthrough:true}));
  app.use((req,res,next)=>{
    if(backendOnlyPath(req.path))return next();
    if(!['GET','HEAD'].includes(req.method))return next();
    const accept=String(req.get('accept')||'');
    if(accept&&!accept.includes('text/html')&&!accept.includes('*/*'))return next();
    if(!fs.existsSync(frontendIndexPath)){
      res.setHeader('Retry-After','5');
      res.setHeader('Cache-Control','no-store');
      return res.status(503).send('Application frontend is starting. Please retry shortly.');
    }
    if(!knownSpaFrontendPath(req.path)){
      res.setHeader('X-Robots-Tag','noindex, nofollow');
      return res.status(404).send('Not found');
    }
    if(privateFrontendPath(req.path))res.setHeader('X-Robots-Tag','noindex, nofollow');
    return res.sendFile(frontendIndexPath,error=>error?next(error):undefined);
  });
}
app.use((req,res)=>res.status(404).json({error:'Not found'}));
app.use((err,req,res,next)=>{if(err.message==='CORS origin not allowed')return res.status(403).json({error:'Origin not allowed'});if(err.type==='entity.parse.failed')return res.status(400).json({error:'Invalid JSON body'});if(err.type==='entity.too.large')return res.status(413).json({error:'Request body is too large'});res.locals.operationalError=err;console.error(`[${req.requestId||'no-request-id'}] Unhandled server error:`,err.stack||err);return res.status(500).json({error:'Internal server error',requestId:req.requestId||undefined});});
let server;let stopLeadPartnerSheetAutoSync=()=>{};let stopAdminGoogleSheetAutoSync=()=>{};let stopFinancialReconciliation=async()=>{};let stopNotifications=async()=>{};let stopPrivateStorageBackup=async()=>{};let stopDatabaseBackup=async()=>{};let shuttingDown=false;let startupReady=false;let startupError=null;let startupTimer=null;let backgroundJobsStarted=false;
async function shutdown(signal,exitCode=0){
  if(shuttingDown)return;
  shuttingDown=true;
  console.log(`${signal} received; shutting down gracefully.`);
  const forceTimer=setTimeout(()=>{console.error('Graceful shutdown timed out; forcing exit.');process.exit(1);},10000);
  forceTimer.unref?.();
  try{
    if(startupTimer){clearTimeout(startupTimer);startupTimer=null;}
    stopLeadPartnerSheetAutoSync();
    stopAdminGoogleSheetAutoSync();
    await stopFinancialReconciliation();
    await stopNotifications();
    await stopPrivateStorageBackup();
    await stopDatabaseBackup();
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
function startBackgroundJobsOnce(){
  if(backgroundJobsStarted)return;
  backgroundJobsStarted=true;
  if(runBackgroundJobsInWeb){
    stopLeadPartnerSheetAutoSync=startLeadPartnerSheetAutoSync();
    stopAdminGoogleSheetAutoSync=startAdminGoogleSheetAutoSync();
    stopFinancialReconciliation=startFinancialReconciliationScheduler({runImmediately:true});
    stopNotifications=startNotificationScheduler({runImmediately:false});
    stopPrivateStorageBackup=startPrivateStorageBackupScheduler({runImmediately:true});
    stopDatabaseBackup=startDatabaseBackupScheduler({runImmediately:true});
  }else console.log('Background jobs disabled in web process (RUN_BACKGROUND_JOBS_IN_WEB=false).');
}

async function initializeDependencies(){
  if(shuttingDown||startupReady)return;
  try{
    console.log('Initializing backend database dependencies...');
    if(runMigrationsOnStartup)await runMigrations();
    else console.log('Database migrations skipped on web startup (RUN_MIGRATIONS_ON_STARTUP=false).');
    startupReady=true;
    startupError=null;
    console.log('Backend database dependencies are ready.');
    startBackgroundJobsOnce();

    // Retention cleanup is housekeeping, not a dependency required to serve API
    // traffic. Run it after readiness so deploy restarts do not return 503 while
    // an old monitoring row is being deleted.
    if(operationalMonitoringEnabled)void operationalMonitoringService.pruneResolved()
      .catch(error=>console.error('Operational-event retention cleanup failed:',error.message));

    // Object storage is important for upload features, but it must not take down
    // authentication, admin, notifications, catalog or lead APIs if R2 is
    // temporarily unavailable or misconfigured. Readiness still reports storage.
    void ensureUploadStorage().then(async()=>{
      console.log('Upload storage is ready.');
      try{
        const migration=await migrateLegacyCompanyProofsToObjectStorage();
        if(migration.enabled&&migration.found){
          console.log(`Legacy company proof migration: found=${migration.found} migrated=${migration.migrated} missing=${migration.missing} failed=${migration.failed}`);
        }
      }catch(error){
        console.error('Legacy company proof migration failed:',error?.message||error);
      }
    }).catch(async error=>{
      console.error('Upload storage initialization is degraded:',error?.message||error);
      await recordFatalProcessError('storage_startup_failure',error).catch(()=>{});
    });
  }catch(error){
    startupReady=false;
    startupError=error?.message||String(error||'Unknown startup error');
    console.error('Backend database initialization failed:');
    console.error(error?.stack||error||'Unknown error');
    await recordFatalProcessError('startup_failure',error).catch(()=>{});
    if(!shuttingDown){
      console.error(`Retrying backend database initialization in ${startupRetryMs}ms.`);
      startupTimer=setTimeout(()=>{startupTimer=null;void initializeDependencies();},startupRetryMs);
      startupTimer.unref?.();
    }
  }
}

async function start(){
  server=app.listen(PORT,'0.0.0.0',()=>{
    console.log(`Server running on port ${PORT}; dependency initialization continues in-process.`);
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

  void initializeDependencies();
}
start();
