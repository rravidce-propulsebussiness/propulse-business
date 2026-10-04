const assert=require('node:assert/strict');

const baseUrl=String(process.env.DEPLOY_BASE_URL||'').replace(/\/$/,'');
const expectedCommit=String(process.env.DEPLOY_EXPECTED_COMMIT||'').trim().toLowerCase();
const expectedEnvironment=String(process.env.DEPLOY_EXPECTED_ENVIRONMENT||'').trim().toLowerCase();
const waitSeconds=Math.min(1800,Math.max(30,Number(process.env.DEPLOY_WAIT_SECONDS)||600));
const pollSeconds=Math.min(30,Math.max(2,Number(process.env.DEPLOY_POLL_SECONDS)||10));

if(!baseUrl)throw new Error('Set DEPLOY_BASE_URL to the environment public origin');
const target=new URL(baseUrl);
if(target.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(target.hostname))throw new Error('DEPLOY_BASE_URL must use HTTPS outside localhost');
if(/(^|\.)(example\.(com|test)|yourdomain\.com)$/i.test(target.hostname))throw new Error('Replace the placeholder deployment hostname before waiting for a release');
if(!expectedCommit||!/^[0-9a-f]{7,64}$/.test(expectedCommit))throw new Error('Set DEPLOY_EXPECTED_COMMIT to the Git commit being promoted');
if(!expectedEnvironment||!/^[a-z0-9_-]{2,30}$/.test(expectedEnvironment))throw new Error('Set DEPLOY_EXPECTED_ENVIRONMENT to staging or production');

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const commitMatches=(actual,expected)=>{
  const left=String(actual||'').trim().toLowerCase(),right=String(expected||'').trim().toLowerCase();
  if(!/^[0-9a-f]{7,64}$/.test(left))return false;
  return left===right||left.startsWith(right)||right.startsWith(left);
};
async function getJson(path){
  const response=await fetch(baseUrl+path,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{accept:'application/json'}});
  let body=null;try{body=await response.json()}catch{}
  return{response,body};
}
async function main(){
  const deadline=Date.now()+waitSeconds*1000;let last='deployment has not reported the requested release yet';
  while(Date.now()<deadline){
    try{
      const version=await getJson('/health/version');
      const actualCommit=String(version.body?.commit||''),actualEnvironment=String(version.body?.environment||'').toLowerCase();
      if(version.response.status!==200)last='version endpoint returned HTTP '+version.response.status;
      else if(!commitMatches(actualCommit,expectedCommit))last='deployed commit is '+(actualCommit||'unknown')+', waiting for '+expectedCommit.slice(0,12);
      else if(actualEnvironment!==expectedEnvironment)last='deployment environment is '+(actualEnvironment||'unknown')+', expected '+expectedEnvironment;
      else{
        const ready=await getJson('/health/ready');
        if(ready.response.status===200&&ready.body?.status==='ok'){console.log('Deployment ready: '+expectedEnvironment+' '+actualCommit.slice(0,12));return}
        last='requested release is visible but readiness returned HTTP '+ready.response.status;
      }
    }catch(error){last=String(error?.message||error).slice(0,240)}
    console.log('Waiting for '+expectedEnvironment+' release '+expectedCommit.slice(0,12)+': '+last);
    await sleep(pollSeconds*1000);
  }
  assert.fail('Deployment did not become ready within '+waitSeconds+' seconds: '+last);
}
main().catch(error=>{console.error(error);process.exitCode=1});
