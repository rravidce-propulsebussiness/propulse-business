const fs=require('fs');
const path=require('path');
const {spawn}=require('child_process');

const frontendRoot=path.resolve(__dirname,'../frontend');
const frontendDist=path.join(frontendRoot,'dist');
const frontendIndex=path.join(frontendDist,'index.html');
const viteBin=path.join(__dirname,'node_modules','vite','bin','vite.js');
let frontendBuilding=false;

function ensureFrontendDependencyLink(){
  const frontendNodeModules=path.join(frontendRoot,'node_modules');
  const backendNodeModules=path.join(__dirname,'node_modules');
  if(fs.existsSync(frontendNodeModules)||!fs.existsSync(backendNodeModules))return;
  try{fs.symlinkSync(backendNodeModules,frontendNodeModules,'dir');}
  catch(error){console.warn('Could not link frontend node_modules to backend dependencies:',error.message);}
}

function run(args,cwd){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{cwd,stdio:'inherit',env:process.env});
    child.once('error',reject);
    child.once('exit',(code,signal)=>{
      if(signal)return reject(new Error('Frontend build terminated by '+signal));
      if(code!==0)return reject(new Error('Frontend build exited with code '+code));
      resolve();
    });
  });
}

async function buildFrontend(){
  if(frontendBuilding||fs.existsSync(frontendIndex))return;
  if(!fs.existsSync(frontendRoot)){
    console.error('Frontend source directory is not available in this Hostinger checkout.');
    return;
  }
  ensureFrontendDependencyLink();
  if(!fs.existsSync(viteBin)){
    console.error('Vite is not installed in backend/node_modules; frontend build cannot start.');
    return;
  }
  frontendBuilding=true;
  console.log('Hostinger single-process app is live; building frontend in the background.');
  try{
    await run([viteBin,'build','--config',path.join(frontendRoot,'vite.config.js')],frontendRoot);
    await run([path.join(frontendRoot,'scripts','generate-seo-static-pages.mjs')],frontendRoot);
    if(!fs.existsSync(frontendIndex))throw new Error('Frontend build completed without frontend/dist/index.html');
    console.log('Hostinger frontend build completed.');
  }catch(error){
    console.error('Hostinger frontend build failed:',error?.stack||error);
  }finally{
    frontendBuilding=false;
  }
}

function startEmergencyFrontend(error){
  const express=require('express');
  const app=express();
  const port=Number(process.env.PORT)||3000;
  console.error('Real backend failed before listen; starting emergency frontend shell.');
  console.error(error?.stack||error);

  app.disable('x-powered-by');
  app.get('/health/live',(req,res)=>res.status(200).json({
    status:'ok',
    mode:'emergency-frontend',
    backend:'startup-failed'
  }));
  app.use('/api',(req,res)=>res.status(503).json({
    error:'Backend startup failed',
    code:'BACKEND_STARTUP_FAILED'
  }));
  app.use(express.static(frontendDist,{index:'index.html',extensions:['html'],fallthrough:true}));
  app.use((req,res,next)=>{
    if(!['GET','HEAD'].includes(req.method))return next();
    const accept=String(req.get('accept')||'');
    if(accept&&!accept.includes('text/html')&&!accept.includes('*/*'))return next();
    if(fs.existsSync(frontendIndex))return res.sendFile(frontendIndex);
    res.setHeader('Cache-Control','no-store');
    return res.status(200).send('<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>ProPulse</title></head><body>Application is recovering. Please retry shortly.</body></html>');
  });
  app.use((req,res)=>res.status(404).json({error:'Not found'}));
  app.listen(port,'0.0.0.0',()=>console.log('Emergency Hostinger frontend listening on port '+port));
}

process.env.NODE_ENV=process.env.NODE_ENV||'production';
process.env.SERVE_FRONTEND_FROM_BACKEND='true';
process.env.RUN_BACKGROUND_JOBS_IN_WEB=process.env.RUN_BACKGROUND_JOBS_IN_WEB||'true';
process.env.REQUIRE_BACKGROUND_WORKER=process.env.REQUIRE_BACKGROUND_WORKER||'false';

try{
  // Hostinger executes this backend directory as the application root. Start the
  // real Express app directly on the managed PORT.
  require('./src/server');
}catch(error){
  startEmergencyFrontend(error);
}

void buildFrontend();
