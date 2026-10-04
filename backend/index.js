const fs=require('fs');
const http=require('http');
const path=require('path');
const {spawn}=require('child_process');
const express=require('express');

const app=express();
const publicPort=Number(process.env.PORT)||3000;
const backendPort=Number(process.env.HOSTINGER_BACKEND_PORT)||5001;
const repoRoot=path.resolve(__dirname,'..');
const frontendRoot=path.join(repoRoot,'frontend');
const frontendDist=path.join(frontendRoot,'dist');
const frontendIndex=path.join(frontendDist,'index.html');
const viteBin=path.join(__dirname,'node_modules','vite','bin','vite.js');
let frontendBuilding=false;

const backendEnv={
  ...process.env,
  PORT:String(backendPort===publicPort?publicPort+1:backendPort),
  NODE_ENV:process.env.NODE_ENV||'production',
  SERVE_FRONTEND_FROM_BACKEND:'false',
  RUN_BACKGROUND_JOBS_IN_WEB:process.env.RUN_BACKGROUND_JOBS_IN_WEB||'true',
  REQUIRE_BACKGROUND_WORKER:process.env.REQUIRE_BACKGROUND_WORKER||'false',
};
const actualBackendPort=Number(backendEnv.PORT);

const backend=spawn(process.execPath,['src/server.js'],{
  cwd:__dirname,
  env:backendEnv,
  stdio:'inherit',
});

function backendRoute(requestPath){
  return requestPath==='/robots.txt'
    ||requestPath==='/sitemap.xml'
    ||requestPath==='/health'
    ||requestPath.startsWith('/health/')
    ||requestPath==='/api'
    ||requestPath.startsWith('/api/')
    ||requestPath.startsWith('/uploads/');
}

function proxyToBackend(req,res){
  const headers={...req.headers,host:'127.0.0.1:'+actualBackendPort};
  const upstream=http.request({
    hostname:'127.0.0.1',
    port:actualBackendPort,
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

async function buildFrontend(){
  if(frontendBuilding||fs.existsSync(frontendIndex))return;
  if(!fs.existsSync(frontendRoot)){
    console.error('Frontend source directory is not available in this Hostinger checkout.');
    return;
  }
  if(!fs.existsSync(viteBin)){
    console.error('Vite is not installed in backend/node_modules; frontend build cannot start.');
    return;
  }
  frontendBuilding=true;
  console.log('Hostinger backend-root app is live; building frontend in the background.');
  const run=(args,cwd)=>new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{cwd,stdio:'inherit',env:process.env});
    child.once('error',reject);
    child.once('exit',(code,signal)=>{
      if(signal)return reject(new Error('Frontend build terminated by '+signal));
      if(code!==0)return reject(new Error('Frontend build exited with code '+code));
      resolve();
    });
  });
  try{
    await run([viteBin,'build','--config',path.join(frontendRoot,'vite.config.js')],frontendRoot);
    await run([path.join(frontendRoot,'scripts','generate-seo-static-pages.mjs')],frontendRoot);
    if(!fs.existsSync(frontendIndex))throw new Error('Frontend build completed without frontend/dist/index.html');
    console.log('Hostinger backend-root frontend build completed.');
  }catch(error){
    console.error('Hostinger backend-root frontend build failed:',error?.stack||error);
  }finally{
    frontendBuilding=false;
  }
}

app.disable('x-powered-by');
app.use((req,res,next)=>backendRoute(req.path)?proxyToBackend(req,res):next());
app.use(express.static(frontendDist,{index:'index.html',extensions:['html'],fallthrough:true}));
app.use((req,res,next)=>{
  if(!['GET','HEAD'].includes(req.method))return next();
  const accept=String(req.get('accept')||'');
  if(accept&&!accept.includes('text/html')&&!accept.includes('*/*'))return next();
  if(!fs.existsSync(frontendIndex)){
    res.setHeader('Retry-After','5');
    res.setHeader('Cache-Control','no-store');
    return res.status(503).send('Application frontend is starting. Please retry shortly.');
  }
  return res.sendFile(frontendIndex,error=>error?next(error):undefined);
});

const server=app.listen(publicPort,'0.0.0.0',()=>{
  console.log('Hostinger backend-root entry listening on port '+publicPort);
  console.log('Proxying API traffic to 127.0.0.1:'+actualBackendPort);
  void buildFrontend();
});

backend.once('exit',(code,signal)=>{
  if(signal)console.error('Backend exited from signal '+signal);
  else if(code)console.error('Backend exited with code '+code);
  if(server.listening)server.close(()=>process.exit(code||1));
});

function shutdown(signal){
  console.log(signal+' received; shutting down Hostinger backend-root entry.');
  backend.kill('SIGTERM');
  server.close(()=>process.exit(0));
  const timer=setTimeout(()=>process.exit(1),10000);
  timer.unref?.();
}
process.once('SIGTERM',()=>shutdown('SIGTERM'));
process.once('SIGINT',()=>shutdown('SIGINT'));
