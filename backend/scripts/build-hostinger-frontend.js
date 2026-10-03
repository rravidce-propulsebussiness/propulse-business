const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');

const backendRoot=path.resolve(__dirname,'..');
const repoRoot=path.resolve(backendRoot,'..');
const frontendRoot=path.join(repoRoot,'frontend');
const frontendDist=path.join(frontendRoot,'dist');
const publicDir=path.join(backendRoot,'public');

function run(command,args,options={}){
  const result=spawnSync(command,args,{stdio:'inherit',shell:process.platform==='win32',...options});
  if(result.status!==0)process.exit(result.status||1);
}

console.log('Installing frontend build dependencies...');
run('npm',['ci','--include=dev'],{cwd:frontendRoot});

console.log('Building frontend and prerendered SEO pages...');
run('npm',['run','build'],{cwd:frontendRoot});

if(!fs.existsSync(path.join(frontendDist,'index.html'))){
  throw new Error('Frontend build did not produce dist/index.html');
}

fs.rmSync(publicDir,{recursive:true,force:true});
fs.cpSync(frontendDist,publicDir,{recursive:true});

console.log('Copied frontend build to '+publicDir);
