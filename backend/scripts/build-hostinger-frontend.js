const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');

const backendRoot=path.resolve(__dirname,'..');
const repoRoot=path.resolve(backendRoot,'..');
const frontendRoot=path.join(repoRoot,'frontend');
const frontendDist=path.join(frontendRoot,'dist');
const frontendIndex=path.join(frontendDist,'index.html');
const backendNodeModules=path.join(backendRoot,'node_modules');
const frontendNodeModules=path.join(frontendRoot,'node_modules');
const viteBin=path.join(backendNodeModules,'vite','bin','vite.js');
let linked=false;

function run(args,cwd){
  const result=spawnSync(process.execPath,args,{cwd,stdio:'inherit',env:process.env});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(args.join(' ')+' exited with code '+result.status);
}

if(!fs.existsSync(frontendRoot)){
  console.log('Hostinger frontend source not present; skipping frontend build.');
  process.exit(0);
}
if(!fs.existsSync(viteBin))throw new Error('Vite is missing from backend/node_modules');
if(!fs.existsSync(frontendNodeModules)){
  fs.symlinkSync(backendNodeModules,frontendNodeModules,'dir');
  linked=true;
}
try{
  console.log('Building frontend during backend dependency installation.');
  run([viteBin,'build','--config',path.join(frontendRoot,'vite.config.js')],frontendRoot);
  run([path.join(frontendRoot,'scripts','generate-seo-static-pages.mjs')],frontendRoot);
  if(!fs.existsSync(frontendIndex))throw new Error('Frontend build did not produce frontend/dist/index.html');
  console.log('Frontend build ready for Hostinger publish.');
}finally{
  if(linked)fs.rmSync(frontendNodeModules,{force:true});
}
