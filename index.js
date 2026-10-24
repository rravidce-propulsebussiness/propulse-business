const fs=require('fs');
const path=require('path');
const {spawn,spawnSync}=require('child_process');
const {ensureFrontendReleaseMarker}=require('./backend/scripts/hostinger-release-marker');

const root=__dirname;
const frontendRoot=path.join(root,'frontend');
const frontendDist=path.join(frontendRoot,'dist');
const frontendIndex=path.join(frontendDist,'index.html');
const bundledFrontendIndex=path.join(root,'backend','hostinger-frontend','index.html');
const prebuiltFrontendReady=()=>fs.existsSync(frontendIndex)||fs.existsSync(bundledFrontendIndex);
const viteBin=path.join(root,'node_modules','vite','bin','vite.js');
let buildPromise=null;

function runSync(command,args,options={}){
  const result=spawnSync(command,args,{cwd:root,stdio:'inherit',env:process.env,...options});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(command+' '+args.join(' ')+' exited with code '+result.status);
}

function runAsync(command,args,options={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd:root,stdio:'inherit',env:process.env,...options});
    child.once('error',reject);
    child.once('exit',(code,signal)=>{
      if(signal)return reject(new Error(command+' terminated by '+signal));
      if(code!==0)return reject(new Error(command+' '+args.join(' ')+' exited with code '+code));
      resolve();
    });
  });
}

function assertBuildTooling(){
  if(!fs.existsSync(viteBin))throw new Error('Vite is missing from root node_modules. Hostinger must run npm install before starting index.js.');
}

function buildFrontendSync(){
  assertBuildTooling();
  ensureFrontendReleaseMarker();
  console.log('Building Hostinger frontend.');
  runSync(process.execPath,[viteBin,'build','--config',path.join(frontendRoot,'vite.config.js')],{cwd:frontendRoot});
  runSync(process.execPath,[path.join(frontendRoot,'scripts','generate-seo-static-pages.mjs')],{cwd:frontendRoot});
  if(!fs.existsSync(frontendIndex))throw new Error('Frontend build completed without producing frontend/dist/index.html');
  console.log('Hostinger frontend build completed.');
}

async function buildFrontendAsync(){
  if(prebuiltFrontendReady())return;
  if(buildPromise)return buildPromise;
  assertBuildTooling();
  ensureFrontendReleaseMarker();
  console.log('Hostinger web server is live; building Vite frontend in the background.');
  buildPromise=(async()=>{
    await runAsync(process.execPath,[viteBin,'build','--config',path.join(frontendRoot,'vite.config.js')],{cwd:frontendRoot});
    await runAsync(process.execPath,[path.join(frontendRoot,'scripts','generate-seo-static-pages.mjs')],{cwd:frontendRoot});
    if(!fs.existsSync(frontendIndex))throw new Error('Frontend build completed without producing frontend/dist/index.html');
    console.log('Hostinger frontend build completed.');
  })().finally(()=>{buildPromise=null;});
  return buildPromise;
}

if(process.argv.includes('--build-only')){
  buildFrontendSync();
  process.exit(0);
}

// Use the existing Express app as Hostinger's *one* managed Node process.
// The previous launcher spawned a second Node process for the backend, and
// both an extra process and on-host Vite compiles can exhaust shared hosting
// process/RAM limits, causing 503 responses for APIs AND static CSS files.
// CI already bakes backend/hostinger-frontend before GitHub deployment.
const legacyProxyMode=String(process.env.HOSTINGER_LEGACY_PROXY_MODE||'').trim().toLowerCase()==='true';
process.env.NODE_ENV=process.env.NODE_ENV||'production';
process.env.RUN_BACKGROUND_JOBS_IN_WEB=process.env.RUN_BACKGROUND_JOBS_IN_WEB||'true';
process.env.REQUIRE_BACKGROUND_WORKER=process.env.REQUIRE_BACKGROUND_WORKER||'false';

if(legacyProxyMode){
  console.warn('Hostinger legacy proxy mode enabled explicitly (emergency rollback).');
  require('./hostinger-server');
}else{
  process.env.SERVE_FRONTEND_FROM_BACKEND='true';
  try{
    require('./backend/src/server');
    console.log('Hostinger single-process Express app started; serving built frontend and APIs directly.');
  }catch(error){
    // The old launcher remains a temporary rollback for a synchronous module
    // startup failure. It is never started alongside a healthy backend.
    console.error('Hostinger single-process startup failed; reverting to legacy proxy:',error?.stack||error);
    require('./hostinger-server');
  }
}

// Only compile at runtime when neither prebuilt frontend exists. In standard
// GitHub deployments this never starts a Vite subprocess on Hostinger.
if(!prebuiltFrontendReady()){
  void buildFrontendAsync().catch(error=>{
    console.error('Hostinger emergency frontend build failed:',error?.stack||error);
    const retry=setTimeout(()=>{
      void buildFrontendAsync().catch(nextError=>console.error('Hostinger frontend build retry failed:',nextError?.stack||nextError));
    },30000);
    retry.unref?.();
  });
}
