const fs=require('fs');
const path=require('path');

const startedAt=new Date().toISOString();
const bakedReleasePath=path.resolve(__dirname,'../../hostinger-release.json');

function bakedCommit(){
  try{
    const payload=JSON.parse(fs.readFileSync(bakedReleasePath,'utf8'));
    return String(payload?.commit||'').trim();
  }catch(error){
    if(error?.code!=='ENOENT'&&error?.name!=='SyntaxError')console.warn('Unable to read baked release identity:',error?.message||error);
    return '';
  }
}
function rawCommit(){
  return String(
    process.env.GIT_COMMIT_SHA||
    process.env.RENDER_GIT_COMMIT||
    process.env.VERCEL_GIT_COMMIT_SHA||
    process.env.RAILWAY_GIT_COMMIT_SHA||
    process.env.HEROKU_SLUG_COMMIT||
    process.env.SOURCE_VERSION||
    process.env.COMMIT_SHA||
    bakedCommit()||
    ''
  ).trim();
}
function commit(){return rawCommit()||'local'}
function shortCommit(){const value=commit();return value==='local'?value:value.slice(0,12)}
function deploymentEnvironment(){return String(process.env.DEPLOY_ENVIRONMENT||process.env.NODE_ENV||'development').trim().toLowerCase()}
function nodeEnvironment(){return String(process.env.NODE_ENV||'development').trim().toLowerCase()}
function releaseId(){return String(process.env.RELEASE_ID||'').trim()||null}
function snapshot(){
  return{commit:commit(),shortCommit:shortCommit(),environment:deploymentEnvironment(),nodeEnvironment:nodeEnvironment(),releaseId:releaseId(),startedAt};
}
module.exports={commit,shortCommit,deploymentEnvironment,nodeEnvironment,releaseId,snapshot,startedAt};
