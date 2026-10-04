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

if(!fs.existsSync(frontendIndex)){
  throw new Error('Hostinger frontend build is missing. Run npm run build before npm start.');
}

const backendEnv={
  ...process.env,
  PORT:String(backendPort),
  NODE_ENV:process.env.NODE_ENV||'production',
  SERVE_FRONTEND_FROM_BACKEND:'false',
  RUN_BACKGROUND_JOBS_IN_WEB:process.env.RUN_BACKGROUND_JOBS_IN_WEB||'true',
  REQUIRE_BACKGROUND_WORKER:process.env.REQUIRE_BACKGROUND_WORKER||'false',
};

const backend=spawn(process.execPath,['src/server.js'],{
  cwd:path.join(__dirname,'backend'),
  env:backendEnv,
  stdio:'inherit',
});

backend.once('exit',(code,signal)=>{
  if(signal)console.error('Hostinger backend process exited from signal '+signal);
  else if(code)console.error('Hostinger backend process exited with code '+code);
  if(server?.listening)server.close(()=>process.exit(code||1));
  else process.exit(code||1);
});

function backendRoute(requestPath){
  return requestPath==='/robots.txt'
    ||requestPath==='/sitemap.xml'
    ||requestPath==='/health'
    ||requestPath.startsWith('/health/')
    ||requestPath.startsWith('/api/')
    ||requestPath==='/api'
    ||requestPath.startsWith('/uploads/');
}

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
    if(!res.headersSent)res.status(502).json({error:'Application backend is starting. Please retry shortly.'});
    else res.end();
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
  console.log('Serving frontend from '+frontendDist);
});

function shutdown(signal){
  console.log(signal+' received by Hostinger wrapper; shutting down.');
  backend.kill('SIGTERM');
  server.close(()=>process.exit(0));
  const timer=setTimeout(()=>process.exit(1),10000);
  timer.unref?.();
}
process.once('SIGTERM',()=>shutdown('SIGTERM'));
process.once('SIGINT',()=>shutdown('SIGINT'));
