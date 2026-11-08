const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const meta = require('../src/services/metaLeadService');
const oauth = require('../src/services/metaLeadOAuthService');

const originalEnv = Object.fromEntries([
  'META_LEADS_APP_ID','META_LEADS_APP_SECRET','META_LEADS_VERIFY_TOKEN',
  'META_LEADS_ENCRYPTION_KEY','META_LEADS_LOGIN_CONFIG_ID'
].map(k => [k,process.env[k]]));
const originalGraph = meta.graph, originalCheck = meta.checkUser, originalConnect = meta.connect;
function res() {
  return {
    cookies:[], redirectTo:null,
    append(name,value) { if(name==='Set-Cookie')this.cookies.push(value); },
    redirect(status,to) {this.redirectTo=to;this.status=status;return this;}
  };
}
function cookie(response,name) {
  const raw = response.cookies.find(c => c.startsWith(name + '=') && !c.includes('Max-Age=0'));
  assert.ok(raw,'expected secure cookie '+name);
  return raw.split(';')[0];
}
async function run() {
  process.env.META_LEADS_APP_ID='1234567891234';
  process.env.META_LEADS_APP_SECRET='test-meta-app-secret';
  process.env.META_LEADS_VERIFY_TOKEN='test-meta-verify';
  process.env.META_LEADS_ENCRYPTION_KEY=crypto.randomBytes(32).toString('base64');
  delete process.env.META_LEADS_LOGIN_CONFIG_ID;
  meta.checkUser=async ()=>'admin';
  meta.graph=async(endpoint,token,opts)=>{
    if(endpoint==='oauth/access_token')return {access_token:opts.params.code?'short-user-token':'long-user-token'};
    if(endpoint==='me/accounts') {
      assert.equal(token,'long-user-token');
      return {data:[{id:'1234567890123',name:'ProPulse Business Page',
        access_token:'a'.repeat(80)}]};
    }
    throw Error('Unexpected Meta Graph path: '+endpoint);
  };
  meta.connect=async(user,page)=>{
    assert.equal(user.id,17);
    assert.equal(page.pageId,'1234567890123');
    assert.equal(page.pageAccessToken,'a'.repeat(80));
    return {pageId:page.pageId,status:'active'};
  };

  const user={id:17,role:'admin'};
  const startResponse=res();
  const start=await oauth.start(user,startResponse);
  const authorization=new URL(start.authorizationUrl);
  assert.equal(authorization.hostname,'www.facebook.com');
  assert.equal(authorization.searchParams.get('client_id'),'1234567891234');
  assert.equal(authorization.searchParams.get('redirect_uri'),oauth.REDIRECT_URI);
  assert.ok(authorization.searchParams.get('state'));
  assert.ok(authorization.searchParams.get('scope').includes('leads_retrieval'));
  assert.ok(!start.authorizationUrl.includes('test-meta-app-secret'));
  const stateCookie=cookie(startResponse,'propulse_meta_oauth_state');
  assert.ok(stateCookie.includes('HttpOnly')===false,'cookie value only does not contain flags');
  assert.match(startResponse.cookies.join(' '),/HttpOnly; SameSite=Lax/);

  const callbackResponse=res();
  await oauth.callback({headers:{cookie:stateCookie},query:{
    state:authorization.searchParams.get('state'),code:'valid-facebook-authorization-code'
  }},callbackResponse);
  assert.equal(callbackResponse.redirectTo,'/admin/leads/meta?metaConnect=choose_page');
  const sessionCookie=cookie(callbackResponse,'propulse_meta_oauth_session');
  assert.ok(!sessionCookie.includes('long-user-token'));

  const requests={headers:{cookie:sessionCookie}};
  const listed=await oauth.pages(user,requests);
  assert.deepEqual(listed.pages,[{pageId:'1234567890123',pageName:'ProPulse Business Page'}]);
  assert.ok(!JSON.stringify(listed).includes('access_token'));
  assert.ok(!JSON.stringify(listed).includes('long-user-token'));

  await assert.rejects(()=>oauth.pages({id:18,role:'admin'},requests),e=>e.code==='META_OAUTH_EXPIRED');
  await assert.rejects(()=>oauth.complete(user,requests,res(),'1111100000'),e=>e.code==='INVALID_META_PAGE');
  const connected=await oauth.complete(user,requests,res(),'1234567890123');
  assert.equal(connected.connection.status,'active');

  const bad=res();
  await oauth.callback({headers:{cookie:stateCookie},query:{
    state:'tampered',code:'valid-facebook-authorization-code'
  }},bad);
  assert.equal(bad.redirectTo,'/admin/leads/meta?metaConnect=state_invalid');

  const partner=res();
  await oauth.start({id:22,role:'lead_partner'},partner);
  const partnerUrl=new URL((await oauth.start({id:22,role:'lead_partner'},res())).authorizationUrl);
  assert.equal(partnerUrl.hostname,'www.facebook.com');
  assert.ok(partner.cookies.some(c=>c.startsWith('propulse_meta_oauth_state=')));

  console.log('Meta Facebook OAuth linking checks passed.');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{
  meta.graph=originalGraph;meta.checkUser=originalCheck;meta.connect=originalConnect;
  for(const [key,val] of Object.entries(originalEnv)) {
    if(val===undefined)delete process.env[key];else process.env[key]=val;
  }
});
