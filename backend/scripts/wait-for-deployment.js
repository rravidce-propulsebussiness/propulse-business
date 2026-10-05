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
function errorSummary(error){
  const cause=error?.cause||{};
  return[
    error?.message,
    cause?.code,
    cause?.hostname,
    cause?.address,
    cause?.port,
    cause?.message,
  ].filter(Boolean).map(String).filter((value,index,array)=>array.indexOf(value)===index).join(' | ').slice(0,500);
}
const commitMatches=(actual,expected)=>{
  const left=String(actual||'').trim().toLowerCase(),right=String(expected||'').trim().toLowerCase();
  if(!/^[0-9a-f]{7,64}$/.test(left))return false;
  return left===right||left.startsWith(right)||right.startsWith(left);
};
function responseSummary(result){
  const {response,text}=result||{};
  if(!response)return 'no response';
  const parts=[
    'HTTP '+response.status,
    response.headers.get('server')?'server='+response.headers.get('server'):null,
    response.headers.get('content-type')?'content-type='+response.headers.get('content-type'):null,
    response.headers.get('via')?'via='+response.headers.get('via'):null,
    response.headers.get('location')?'location='+response.headers.get('location'):null,
    text?'body='+text.replace(/\s+/g,' ').slice(0,180):null,
  ].filter(Boolean);
  return parts.join(', ').slice(0,600);
}
async function getJson(path){
  const response=await fetch(baseUrl+path,{
    redirect:'manual',
    signal:AbortSignal.timeout(10000),
    headers:{
      accept:'application/json',
      'cache-control':'no-cache',
      'user-agent':'ProPulse-Deployment-Check/1.0'
    }
  });
  const text=await response.text();
  let body=null;try{body=text?JSON.parse(text):null}catch{}
  return{response,body,text};
}
async function main(){
  const deadline=Date.now()+waitSeconds*1000;
  let last='deployment has not reported the requested release yet';
  let forbiddenStreak=0;
  while(Date.now()<deadline){
    try{
      const [version,marker]=await Promise.all([getJson('/health/version'),getJson('/release.json')]);
      const versionCommit=String(version.body?.commit||'');
      const markerCommit=String(marker.body?.commit||'');
      const versionEnvironment=String(version.body?.environment||'').toLowerCase();
      const markerEnvironment=String(marker.body?.environment||'').toLowerCase();
      const matchedCommit=commitMatches(versionCommit,expectedCommit)
        ? versionCommit
        : (commitMatches(markerCommit,expectedCommit)?markerCommit:'');
      const actualEnvironment=versionEnvironment||markerEnvironment;

      if(version.response.status!==200&&marker.response.status!==200){
        const bothForbidden=version.response.status===403&&marker.response.status===403;
        forbiddenStreak=bothForbidden?forbiddenStreak+1:0;
        if(bothForbidden){
          const homepage=await getJson('/').catch(()=>null);
          last='Hostinger edge denied public deployment checks: version ['+responseSummary(version)+'], marker ['+responseSummary(marker)+']'
            +(homepage?', homepage ['+responseSummary(homepage)+']':'');
          if(forbiddenStreak>=3)throw new Error(last+'; repeated 403 indicates an edge/security/routing block before Express');
        }else{
          last='version endpoint ['+responseSummary(version)+'] and release marker ['+responseSummary(marker)+']';
        }
      }else if(!matchedCommit){
        forbiddenStreak=0;
        last='backend commit is '+(versionCommit||'unknown')+', frontend marker is '+(markerCommit||'unknown')+', waiting for '+expectedCommit.slice(0,12);
      }else if(actualEnvironment&&actualEnvironment!==expectedEnvironment){
        forbiddenStreak=0;
        last='deployment environment is '+actualEnvironment+', expected '+expectedEnvironment;
      }else{
        forbiddenStreak=0;
        const ready=await getJson('/health/ready');
        if(ready.response.status===200&&ready.body?.status==='ok'){
          const source=commitMatches(versionCommit,expectedCommit)?'backend version':'frontend release marker';
          console.log('Deployment ready via '+source+': '+expectedEnvironment+' '+matchedCommit.slice(0,12));
          return;
        }
        last='requested release is visible but readiness returned HTTP '+ready.response.status;
      }
    }catch(error){last=errorSummary(error)||String(error).slice(0,500)}
    console.log('Waiting for '+expectedEnvironment+' release '+expectedCommit.slice(0,12)+': '+last);
    await sleep(pollSeconds*1000);
  }
  assert.fail('Deployment did not become ready within '+waitSeconds+' seconds: '+last);
}
main().catch(error=>{console.error(error);process.exitCode=1});
