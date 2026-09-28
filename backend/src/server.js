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
const faqRoutes=require('./routes/faqRoutes');const upcomingFeatureRoutes=require('./routes/upcomingFeatureRoutes');const publicFaqRoutes=require('./routes/publicFaqRoutes');
const homepageMediaRoutes=require('./routes/homepageMediaRoutes');
const contactRoutes=require('./routes/contactRoutes');
const adminFaqRoutes=require('./routes/adminFaqRoutes');
const { startLeadPartnerSheetAutoSync }=require('./services/leadPartnerSheetSyncScheduler');
const { startAdminGoogleSheetAutoSync }=require('./services/adminGoogleSheetSyncScheduler');
const rateLimit=require('./middleware/rateLimitMiddleware');
const csrfProtection=require('./middleware/csrfMiddleware');
const {getConfiguredOrigins}=require('./config/httpOrigins');
const {envFlag}=require('./config/runtimeFlags');
const {uploadRoot,checkUploadStorage,ensureUploadStorage}=require('./config/uploadStorage');
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
const runMigrationsOnStartup=envFlag('RUN_MIGRATIONS_ON_STARTUP',true);
const runBackgroundJobsInWeb=envFlag('RUN_BACKGROUND_JOBS_IN_WEB',true);
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
app.use(cors({origin(origin,callback){if(!origin||configuredOrigins.includes(origin))return callback(null,true);return callback(new Error('CORS origin not allowed'));},credentials:true}));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Permissions-Policy','camera=(),microphone=(),geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'");if(isProduction)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');next();});
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
app.use(express.json({limit:DEFAULT_JSON_BYTES}));
app.use('/api',csrfProtection);
const apiRateLimit=rateLimit({windowMs:15*60*1000,max:600,scope:'global',shared:true,sharedChunkSize:10});
app.use('/api',apiRateLimit);
app.use('/uploads',(req,res,next)=>{if(req.path==='/company-proofs'||req.path.startsWith('/company-proofs/'))return res.status(404).json({error:'Not found'});if(req.path==='/private-proofs'||req.path.startsWith('/private-proofs/'))return res.status(404).json({error:'Not found'});return next();});
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
async function readiness(req,res){
  setHealthHeaders(res);
  const [database,storage]=await Promise.allSettled([
    withTimeout(pool.query('SELECT 1'),'Database'),
    withTimeout(checkUploadStorage(),'Upload storage')
  ]);
  const databaseReady=database.status==='fulfilled';
  const storageReady=storage.status==='fulfilled';
  if(databaseReady&&storageReady)return res.json({status:'ok',database:'connected',storage:'ready'});
  if(!databaseReady)console.error(`[${req.requestId}] Readiness database check failed:`,database.reason?.message||database.reason);
  if(!storageReady)console.error(`[${req.requestId}] Readiness storage check failed:`,storage.reason?.message||storage.reason);
  return res.status(503).json({
    status:'error',
    database:databaseReady?'connected':'unavailable',
    storage:storageReady?'ready':'unavailable'
  });
}
app.get('/health/ready',readiness);
app.get('/health',readiness);
app.use('/api/auth',authRoutes);app.use('/api/profile',profileRoutes);app.use('/api/admin',adminRoutes);app.use('/api/lead-partner',leadPartnerRoutes);app.use('/api/lead-reports',leadReportRoutes);app.use('/api/lead-partner/faqs',faqRoutes);app.use('/api/faqs',publicFaqRoutes);app.use('/api/upcoming-features',upcomingFeatureRoutes);app.use('/api/contact',contactRoutes);app.use('/api/homepage-media',homepageMediaRoutes);app.use('/api/admin/faqs',adminFaqRoutes);app.use('/api/leads',leadRoutes);app.use('/api/payments',paymentRoutes);app.use('/api/payment-receiving-details',paymentReceivingDetailsRoutes);app.use('/api/coupons',couponRoutes);app.use('/api/membership-plans',membershipPlanRoutes);app.use('/api/admin/commercial',adminCommercialRoutes);app.use('/api/wallet',walletRoutes);app.use('/api/investments',investmentRoutes);app.use('/api/investor/payout-account',investorPayoutAccountRoutes);app.use('/api/industries',industryRoutes);app.use('/api/services',serviceRoutes);app.use('/api/subservices',subserviceRoutes);app.use('/api/states',stateRoutes);app.use('/api/cities',cityRoutes);app.use('/api/subcities',subcityRoutes);app.use('/api/pincodes',pincodeRoutes);
app.use((req,res)=>res.status(404).json({error:'Not found'}));
app.use((err,req,res,next)=>{if(err.message==='CORS origin not allowed')return res.status(403).json({error:'Origin not allowed'});if(err.type==='entity.parse.failed')return res.status(400).json({error:'Invalid JSON body'});if(err.type==='entity.too.large')return res.status(413).json({error:'Request body is too large'});console.error(`[${req.requestId||'no-request-id'}] Unhandled server error:`,err.stack||err);return res.status(500).json({error:'Internal server error',requestId:req.requestId||undefined});});
let server;let stopLeadPartnerSheetAutoSync=()=>{};let stopAdminGoogleSheetAutoSync=()=>{};let shuttingDown=false;
async function shutdown(signal){
  if(shuttingDown)return;
  shuttingDown=true;
  console.log(`${signal} received; shutting down gracefully.`);
  const forceTimer=setTimeout(()=>{console.error('Graceful shutdown timed out; forcing exit.');process.exit(1);},10000);
  forceTimer.unref?.();
  try{
    stopLeadPartnerSheetAutoSync();
    stopAdminGoogleSheetAutoSync();
    if(server?.listening){
      await new Promise((resolve,reject)=>server.close(error=>{
        if(!error||error.code==='ERR_SERVER_NOT_RUNNING')return resolve();
        return reject(error);
      }));
      server.closeIdleConnections?.();
    }
    await pool.end();
    clearTimeout(forceTimer);
    process.exit(0);
  }catch(error){
    clearTimeout(forceTimer);
    console.error('Graceful shutdown failed:',error?.stack||error);
    process.exit(1);
  }
}
async function start(){
  try{
    await ensureUploadStorage();
    if(runMigrationsOnStartup)await runMigrations();
    else console.log('Database migrations skipped on web startup (RUN_MIGRATIONS_ON_STARTUP=false).');
    server=app.listen(PORT,'0.0.0.0',()=>{
      console.log(`Server running on port ${PORT}`);
      if(runBackgroundJobsInWeb){
        stopLeadPartnerSheetAutoSync=startLeadPartnerSheetAutoSync();
        stopAdminGoogleSheetAutoSync=startAdminGoogleSheetAutoSync();
      }else console.log('Background jobs disabled in web process (RUN_BACKGROUND_JOBS_IN_WEB=false).');
    });
    server.requestTimeout=httpRequestTimeoutMs;
    server.headersTimeout=httpHeadersTimeoutMs;
    server.keepAliveTimeout=httpKeepAliveTimeoutMs;
    server.maxRequestsPerSocket=httpMaxRequestsPerSocket;
    server.maxHeadersCount=100;
    process.once('SIGTERM',()=>shutdown('SIGTERM'));
    process.once('SIGINT',()=>shutdown('SIGINT'));
  }catch(error){
    console.error('Backend startup failed:');
    console.error(error?.stack||error||'Unknown error');
    await pool.end();
    process.exitCode=1;
  }
}
start();
