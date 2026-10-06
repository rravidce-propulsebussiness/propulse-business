const assert=require('node:assert/strict');
const http=require('node:http');
const path=require('node:path');
const {spawn}=require('node:child_process');

async function main(){
  const server=http.createServer((req,res)=>{
    res.statusCode=403;
    res.setHeader('server','hcdn');
    res.setHeader('content-type','text/html');
    res.end('<!doctype html><title>Forbidden</title>');
  });

  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });

  const address=server.address();
  const started=Date.now();
  let output='';
  const child=spawn(process.execPath,['scripts/wait-for-deployment.js'],{
    cwd:path.resolve(__dirname,'..'),
    env:{
      ...process.env,
      DEPLOY_BASE_URL:'http://127.0.0.1:'+address.port,
      DEPLOY_EXPECTED_COMMIT:'abcdef1234567',
      DEPLOY_EXPECTED_ENVIRONMENT:'production',
      DEPLOY_WAIT_SECONDS:'30',
      DEPLOY_POLL_SECONDS:'2'
    },
    stdio:['ignore','pipe','pipe']
  });
  child.stdout.on('data',chunk=>{output+=chunk});
  child.stderr.on('data',chunk=>{output+=chunk});

  const timeout=setTimeout(()=>child.kill('SIGKILL'),12000);
  const code=await new Promise(resolve=>child.once('exit',resolve));
  clearTimeout(timeout);
  await new Promise(resolve=>server.close(resolve));

  const elapsed=Date.now()-started;
  assert.notEqual(code,0,'Waiter must fail when Hostinger edge blocks public deployment checks');
  assert(elapsed<10000,'Repeated Hostinger 403 responses must fail fast instead of waiting for the full deployment timeout');
  assert.match(output,/HOSTINGER_EDGE_FORBIDDEN|repeated 403 indicates an edge\/security\/routing block before Express/,'Waiter must report the Hostinger edge block');
  const polls=(output.match(/Waiting for production release/g)||[]).length;
  assert(polls<=3,'Waiter must stop after the third consecutive dual-403 response');

  console.log('Deployment waiter Hostinger 403 fast-fail runtime test passed in '+elapsed+'ms.');
}

main().catch(error=>{console.error(error);process.exitCode=1});
