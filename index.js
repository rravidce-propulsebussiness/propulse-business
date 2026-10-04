const fs=require('fs');
const path=require('path');
const {spawn,spawnSync}=require('child_process');

const root=__dirname;
const frontendRoot=path.join(root,'frontend');
const frontendDist=path.join(frontendRoot,'dist');
const frontendIndex=path.join(frontendDist,'index.html');
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
  if(fs.existsSync(frontendIndex))return;
  assertBuildTooling();
  console.log('Building Hostinger frontend.');
  runSync(process.execPath,[viteBin,'build','--config',path.join(frontendRoot,'vite.config.js')],{cwd:frontendRoot});
  runSync(process.execPath,[path.join(frontendRoot,'scripts','generate-seo-static-pages.mjs')],{cwd:frontendRoot});
  if(!fs.existsSync(frontendIndex))throw new Error('Frontend build completed without producing frontend/dist/index.html');
  console.log('Hostinger frontend build completed.');
}

async function buildFrontendAsync(){
  if(fs.existsSync(frontendIndex))return;
  if(buildPromise)return buildPromise;
  assertBuildTooling();
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

// Open Hostinger's public port immediately. Managed hosting validates that the
// Express process starts successfully; the frontend can finish building after
// the server is already accepting health/API requests.
require('./hostinger-server');

void buildFrontendAsync().catch(error=>{
  console.error('Hostinger background frontend build failed:',error?.stack||error);
  const retry=setTimeout(()=>{
    void buildFrontendAsync().catch(nextError=>console.error('Hostinger frontend build retry failed:',nextError?.stack||nextError));
  },30000);
  retry.unref?.();
});
