const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');

const root=__dirname;
const frontendRoot=path.join(root,'frontend');
const frontendDist=path.join(frontendRoot,'dist');
const frontendIndex=path.join(frontendDist,'index.html');

function run(command,args,options={}){
  const result=spawnSync(command,args,{cwd:root,stdio:'inherit',env:process.env,...options});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(command+' '+args.join(' ')+' exited with code '+result.status);
}

function ensureFrontendBuild(){
  if(fs.existsSync(frontendIndex))return;
  const viteBin=path.join(root,'node_modules','vite','bin','vite.js');
  if(!fs.existsSync(viteBin))throw new Error('Vite is missing from root node_modules. Hostinger must run npm install before starting index.js.');
  console.log('Hostinger frontend build not found; building Vite frontend at startup.');
  run(process.execPath,[viteBin,'build','--config',path.join(frontendRoot,'vite.config.js')],{cwd:frontendRoot});
  run(process.execPath,[path.join(frontendRoot,'scripts','generate-seo-static-pages.mjs')],{cwd:frontendRoot});
  if(!fs.existsSync(frontendIndex))throw new Error('Frontend build completed without producing frontend/dist/index.html');
  console.log('Hostinger frontend build completed.');
}

ensureFrontendBuild();

if(process.argv.includes('--build-only')){
  process.exit(0);
}

require('./hostinger-server');
