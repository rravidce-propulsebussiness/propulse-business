const fs=require('fs');
const http=require('http');
const path=require('path');
const {spawn}=require('child_process');

const express=require('express');
const app=express();

const publicPort=Number(process.env.PORT)||3000;
const requestedBackendPort=Number(process.env.HOSTINGER_BACKEND_PORT)||5001;
const backendPort=requestedBackendPort===publicPort?publicPort+1:requestedBackendPort;
const frontendDist=path.join(__dirname,'frontend','dist');
const frontendIndex=path.join(frontendDist,'index.html');
const isProduction=String(process.env.NODE_ENV||'production')==='production';
const backendRestartMs=Math.min(30000,Math.max(1000,Number(process.env.HOSTINGER_BACKEND_RESTART_MS)||3000));

const backendEnv={
  ...process.env,
  PORT:String(backendPort),
  NODE_ENV:process.env.NODE_ENV||'production',
  SERVE_FRONTEND_FROM_BACKEND:'false',
  RUN_BACKGROUND_JOBS_IN_WEB:process.env.RUN_BACKGROUND_JOBS_IN_WEB||'true',
  REQUIRE_BACKGROUND_WORKER:process.env.REQUIRE_BACKGROUND_WORKER||'false',
};

let backend=null;
let backendRestartTimer=null;
let shuttingDown=false;

function scheduleBackendRestart(reason){
  if(shuttingDown||backendRestartTimer)return;
  console.error('Hostinger backend unavailable'+(reason?': '+reason:'')+'. Retrying in '+backendRestartMs+'ms.');
  backendRestartTimer=setTimeout(()=>{
    backendRestartTimer=null;
    startBackend();
  },backendRestartMs);
  backendRestartTimer.unref?.();
}

function startBackend(){
  if(shuttingDown)return;
  let child;
  try{
    child=spawn(process.execPath,['src/server.js'],{
      cwd:path.join(__dirname,'backend'),
      env:backendEnv,
      stdio:'inherit',
    });
  }catch(error){
    scheduleBackendRestart(error?.message||String(error));
    return;
  }
  backend=child;
  child.once('error',error=>{
    if(backend===child)backend=null;
    scheduleBackendRestart(error?.message||String(error));
  });
  child.once('exit',(code,signal)=>{
    if(backend===child)backend=null;
    if(shuttingDown)return;
    if(signal)console.error('Hostinger backend process exited from signal '+signal);
    else console.error('Hostinger backend process exited with code '+String(code));
    scheduleBackendRestart();
  });
}

startBackend();

function backendRoute(requestPath){
  return requestPath==='/robots.txt'
    ||requestPath==='/sitemap.xml'
    ||requestPath==='/health'
    ||requestPath.startsWith('/health/')
    ||requestPath.startsWith('/api/')
    ||requestPath==='/api'
    ||requestPath.startsWith('/uploads/');
}

function privateFrontendPath(requestPath){
  return /^\/(admin|login|signup|forgot-password|reset-password|profile|wallet|membership|notifications|purchased-leads|my-leads|investment|lead-partner|requirements|estimate|professional-contact|professionals|upcoming-features|dashboard)(\/|$)/.test(requestPath);
}
const publicSpaFrontendPaths=new Set(['/','/home','/quote','/solutions','/build','/design','/property','/experts','/packages','/projects','/how-it-works','/about','/real-estate','/contact','/faq','/pricing','/industries','/leads','/hyderabad','/guides','/interior-estimator','/interior-cost-estimator','/construction-estimator','/construction-cost-estimator']);
function publicDynamicFrontendPath(requestPath){return /^\/hyderabad\/[a-z0-9-]+(?:\/(?:compare-options|[a-z0-9-]+))?$/.test(requestPath)||/^\/guides\/[a-z0-9-]+$/.test(requestPath)||/^\/[a-z0-9-]+\/construction(?:\/[a-z0-9-]+)?$/.test(requestPath);}
function knownSpaFrontendPath(requestPath){return privateFrontendPath(requestPath)||publicSpaFrontendPaths.has(requestPath)||publicDynamicFrontendPath(requestPath);}

function proxyToBackend(req,res){
  const forwardedProto=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim()||(req.socket.encrypted?'https':'https');
  const forwardedHost=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  const headers={
    ...req.headers,
    host:'127.0.0.1:'+backendPort,
    'x-forwarded-proto':forwardedProto,
    'x-forwarded-host':forwardedHost,
    'x-forwarded-for':String(req.headers['x-forwarded-for']||req.socket.remoteAddress||''),
  };
  const upstream=http.request({
    hostname:'127.0.0.1',
    port:backendPort,
    method:req.method,
    path:req.originalUrl,
    headers,
  },upstreamResponse=>{
    res.statusCode=upstreamResponse.statusCode||502;
    for(const [name,value] of Object.entries(upstreamResponse.headers)){
      if(value!==undefined)res.setHeader(name,value);
    }
    upstreamResponse.pipe(res);
  });
  upstream.on('error',error=>{
    console.error('Hostinger backend proxy failed:',error.message);
    if(!res.headersSent){
      if(req.path==='/health/live'){
        res.setHeader('Cache-Control','no-store');
        return res.status(200).json({status:'ok',wrapper:'live',backend:'restarting'});
      }
      return res.status(503).json({error:'Application backend is starting. Please retry shortly.'});
    }
    res.end();
  });
  req.pipe(upstream);
}

app.disable('x-powered-by');
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(isProduction)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  if(/^\/(admin|login|signup|forgot-password|reset-password|profile|wallet|membership|notifications|purchased-leads|my-leads|investment|lead-partner|requirements|estimate|professional-contact|professionals|upcoming-features)(\/|$)/.test(req.path)){
    res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  }
  next();
});

for(const [from,to] of [
  ['/estimate/construction-cost-estimator','/quote?package=standard#construction'],
  ['/construction-cost-estimator','/quote?package=standard#construction'],
  ['/construction-estimator','/quote?package=standard#construction'],
  ['/estimate/interior-cost-estimator','/packages#interior'],
  ['/interior-cost-estimator','/packages#interior'],
  ['/interior-estimator','/packages#interior'],
]){
  app.get(from,(req,res)=>res.redirect(301,to));
}

app.use((req,res,next)=>backendRoute(req.path)?proxyToBackend(req,res):next());

app.use(express.static(frontendDist,{
  index:'index.html',
  extensions:['html'],
  fallthrough:true,
  dotfiles:'ignore',
  setHeaders(res,filePath){
    if(filePath.includes(path.sep+'assets'+path.sep))res.setHeader('Cache-Control','public, max-age=31536000, immutable');
    else res.setHeader('Cache-Control','no-cache');
  },
}));

app.use((req,res,next)=>{
  if(!['GET','HEAD'].includes(req.method))return next();
  const accept=String(req.get('accept')||'');
  if(accept&&!accept.includes('text/html')&&!accept.includes('*/*'))return next();
  if(!fs.existsSync(frontendIndex)){
    res.setHeader('Retry-After','5');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-App-Starting','frontend');
    return res.status(200).send('<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>ProPulse</title></head><body>Application is starting. Please retry shortly.</body></html>');
  }
  if(!knownSpaFrontendPath(req.path)){
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    return res.status(404).send('Not found');
  }
  return res.sendFile(frontendIndex,error=>error?next(error):undefined);
});

app.use((err,req,res,next)=>{
  console.error('Hostinger frontend error:',err?.stack||err);
  if(res.headersSent)return next(err);
  return res.status(500).send('Application error');
});

let server=app.listen(publicPort,'0.0.0.0',()=>{
  console.log('Hostinger web entry listening on port '+publicPort);
  console.log('Proxying backend traffic to 127.0.0.1:'+backendPort);
  console.log('Serving frontend from '+frontendDist+(fs.existsSync(frontendIndex)?' (ready)':' (building)'));
});

function shutdown(signal){
  if(shuttingDown)return;
  shuttingDown=true;
  console.log(signal+' received by Hostinger wrapper; shutting down.');
  if(backendRestartTimer){
    clearTimeout(backendRestartTimer);
    backendRestartTimer=null;
  }
  backend?.kill('SIGTERM');
  server.close(()=>process.exit(0));
  const timer=setTimeout(()=>process.exit(1),10000);
  timer.unref?.();
}
process.once('SIGTERM',()=>shutdown('SIGTERM'));
process.once('SIGINT',()=>shutdown('SIGINT'));
