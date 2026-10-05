const fs=require('fs');
const path=require('path');

const backendRoot=path.resolve(__dirname,'..');
const repoRoot=path.resolve(backendRoot,'..');
const bakedReleasePath=path.join(backendRoot,'hostinger-release.json');
const frontendPublicDir=path.join(repoRoot,'frontend','public');
const frontendReleasePath=path.join(frontendPublicDir,'release.json');

function readBakedRelease(){
  try{
    const payload=JSON.parse(fs.readFileSync(bakedReleasePath,'utf8'));
    if(payload&&typeof payload==='object'&&String(payload.commit||'').trim())return payload;
  }catch(error){
    if(error?.code!=='ENOENT'&&error?.name!=='SyntaxError')console.warn('Unable to read baked Hostinger release marker:',error?.message||error);
  }
  return null;
}
function envRelease(){
  const commit=String(
    process.env.GIT_COMMIT_SHA||
    process.env.COMMIT_SHA||
    process.env.SOURCE_VERSION||
    ''
  ).trim();
  if(!commit)return null;
  return{
    commit,
    environment:String(process.env.DEPLOY_ENVIRONMENT||process.env.NODE_ENV||'production').trim().toLowerCase(),
    builtAt:new Date().toISOString()
  };
}
function ensureFrontendReleaseMarker(){
  const release=readBakedRelease()||envRelease();
  if(!release){
    console.warn('No release identity is available; frontend release marker was not generated.');
    return null;
  }
  fs.mkdirSync(frontendPublicDir,{recursive:true});
  fs.writeFileSync(frontendReleasePath,JSON.stringify(release)+'\n');
  console.log('Frontend release marker prepared for '+String(release.commit).slice(0,12)+'.');
  return{path:frontendReleasePath,release};
}

module.exports={
  bakedReleasePath,frontendReleasePath,readBakedRelease,envRelease,ensureFrontendReleaseMarker
};
