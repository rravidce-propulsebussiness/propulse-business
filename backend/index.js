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

process.env.NODE_ENV=process.env.NODE_ENV||'production';
process.env.SERVE_FRONTEND_FROM_BACKEND='true';
process.env.RUN_BACKGROUND_JOBS_IN_WEB=process.env.RUN_BACKGROUND_JOBS_IN_WEB||'true';
process.env.REQUIRE_BACKGROUND_WORKER=process.env.REQUIRE_BACKGROUND_WORKER||'false';

// Start the real Express API directly on Hostinger's public port. No child
// process or localhost proxy is used, avoiding managed-hosting 502s.
require('./src/server');

void buildFrontend();
