const assert=require('assert');
const csrfProtection=require('../src/middleware/csrfMiddleware');

function run(req){
  const response={statusCode:200,body:null,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
  let nextCalled=false;
  csrfProtection(req,response,()=>{nextCalled=true});
  return {response,nextCalled};
}

process.env.CORS_ORIGIN='http://localhost:5173,https://app.propulse.example';

let result=run({method:'GET',headers:{cookie:'propulse_auth=token'}});
assert.equal(result.nextCalled,true,'safe methods must bypass CSRF checks');

result=run({method:'POST',headers:{cookie:'propulse_auth=token'}});
assert.equal(result.response.statusCode,403,'cookie-auth write without origin must be rejected');
assert.equal(result.response.body.error,'CSRF validation failed');

result=run({method:'POST',headers:{cookie:'propulse_auth=token'},origin:'http://localhost:5173'});
assert.equal(result.nextCalled,true,'allowed configured origin must pass');

result=run({method:'POST',headers:{cookie:'propulse_auth=token'},origin:'https://evil.example'});
assert.equal(result.response.statusCode,403,'untrusted origin must be rejected');

result=run({method:'POST',headers:{cookie:'propulse_auth=token'},referer:'http://localhost:5173/account'});
assert.equal(result.nextCalled,true,'allowed Referer origin must pass when Origin is absent');

result=run({method:'POST',headers:{cookie:'propulse_auth=token'},referer:'https://evil.example/account'});
assert.equal(result.response.statusCode,403,'untrusted Referer origin must be rejected');

result=run({method:'POST',headers:{authorization:'Bearer test-token'}});
assert.equal(result.nextCalled,true,'Bearer-authenticated clients must not require cookie CSRF headers');

result=run({method:'POST',headers:{}});
assert.equal(result.nextCalled,true,'unauthenticated writes are handled by their route auth/rate limits');

console.log('CSRF security regression test passed.');
