/* An isolated security regression check. Does not connect to production DB. */
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');

const env = {
  PROPULSE_OAUTH_ENABLED: process.env.PROPULSE_OAUTH_ENABLED,
  PROPULSE_OAUTH_CLIENT_ID: process.env.PROPULSE_OAUTH_CLIENT_ID,
  PROPULSE_OAUTH_CLIENT_SECRET: process.env.PROPULSE_OAUTH_CLIENT_SECRET,
  PROPULSE_OAUTH_REDIRECT_URI: process.env.PROPULSE_OAUTH_REDIRECT_URI,
};
process.env.PROPULSE_OAUTH_ENABLED = 'true';
process.env.PROPULSE_OAUTH_CLIENT_ID = 'business-os-test-client';
process.env.PROPULSE_OAUTH_CLIENT_SECRET = 'test-secret-must-be-longer-than-thirty-two-characters';
process.env.PROPULSE_OAUTH_REDIRECT_URI = 'https://testproject.supabase.co/auth/v1/callback';

let verified = true;
let active = true;
let version = 0;
const codes = new Map();
const tokens = new Map();
const user = { id: 5, email: 'verified@example.test', name: 'Verified Account' };
const pool = {
  async query(sql, p) {
    if (sql.includes('SELECT id,email,name,auth_version,email_verified_at')) {
      return { rows: active ? [{...user, auth_version: version, email_verified_at: verified ? new Date() : null}] : [] };
    }
    if (sql.includes('INSERT INTO propulse_oauth_authorization_codes')) {
      codes.set(p[0], {user_id:p[1],client_id:p[2],redirect_uri:p[3],code_challenge:p[4],auth_version:p[5],expires_at:new Date(Date.now()+180000)});
      return {rows:[]};
    }
    if (sql.includes('DELETE FROM propulse_oauth_authorization_codes')) {
      const code = codes.get(p[0]);
      if (!code || code.client_id !== p[1] || code.redirect_uri !== p[2]) return {rows:[]};
      codes.delete(p[0]);
      return {rows:[code]};
    }
    if (sql.includes('SELECT id FROM users')) return {rows:active && verified && Number(p[1])===version ? [{id:user.id}]:[]};
    if (sql.includes('INSERT INTO propulse_oauth_access_tokens')) {
      tokens.set(p[0],{user_id:p[1],client_id:p[2],auth_version:p[3],expires_at:Date.now()+300000});
      return {rows:[]};
    }
    if (sql.includes('FROM propulse_oauth_access_tokens t')) {
      const token=tokens.get(p[0]);
      return {rows:token && token.client_id===p[1] && token.auth_version===version && active && verified && token.expires_at>Date.now() ? [user]:[]};
    }
    throw Error('Unexpected test SQL: '+sql);
  },
};
function stub(relative, exported) {
  const location = require.resolve(path.resolve(__dirname, relative));
  const original = require.cache[location];
  require.cache[location] = {id:location,filename:location,loaded:true,exports:exported};
  return () => { if (original) require.cache[location]=original; else delete require.cache[location]; };
}
const restore = [
  stub('../src/config/database',pool),
  stub('../src/services/authService',{verifyToken:token=>token==='valid' ? {id:5,auth_version:0}:null}),
  stub('../src/middleware/rateLimitMiddleware',()=>(_req,_res,next)=>next()),
];
const {router,validatedAuthorizeParams,secureEquals} = require('../src/routes/oauthRoutes');

async function main() {
  assert.equal(secureEquals('correct','correct'),true);
  assert.equal(secureEquals('wrong','correct'),false);
  assert.equal(validatedAuthorizeParams({client_id:'bad'}),null);
  const app=express();
  app.use('/api/oauth',router);
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try {
    const verifier=crypto.randomBytes(32).toString('base64url');
    const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
    const params=new URLSearchParams({
      client_id:process.env.PROPULSE_OAUTH_CLIENT_ID,
      redirect_uri:process.env.PROPULSE_OAUTH_REDIRECT_URI,
      response_type:'code',
      state:'secure-state-value-1234',
      code_challenge:challenge,
      code_challenge_method:'S256',
      scope:'openid email profile',
    });
    const endpoint=base+'/api/oauth/authorize?'+params;
    let response=await fetch(endpoint,{redirect:'manual'});
    assert.equal(response.status,303,'anonymous must redirect to ProPulse login');
    assert.match(response.headers.get('location'),/^\/login\?returnTo=/);
    // Supabase adds redirect_to and uses UUID-style state. Neither should break PKCE.
    const supabaseParams=new URLSearchParams(params);
    supabaseParams.set('state','eecd9272-08eb-4b73-bf90-eb2b41d596d0');
    supabaseParams.set('redirect_to','https://sghomesinterior.in/auth/callback');
    response=await fetch(base+'/api/oauth/authorize?'+supabaseParams,{redirect:'manual'});
    assert.equal(response.status,303,'Supabase formatted authorization must be accepted');
    const wrongClient=new URLSearchParams(supabaseParams);
    wrongClient.set('client_id','another-client-id');
    response=await fetch(base+'/api/oauth/authorize?'+wrongClient,{redirect:'manual'});
    assert.equal(response.status,400);
    assert.deepEqual(await response.json(),{error:'invalid_request',reason:'client_id_mismatch'});
    assert.match(response.headers.get('cache-control'),/no-store/);
    const wrongCallback=new URLSearchParams(supabaseParams);
    wrongCallback.set('redirect_uri','https://wrong.supabase.co/auth/v1/callback');
    response=await fetch(base+'/api/oauth/authorize?'+wrongCallback,{redirect:'manual'});
    assert.equal(response.status,400);
    assert.deepEqual(await response.json(),{error:'invalid_request',reason:'redirect_uri_mismatch'});
    process.env.PROPULSE_OAUTH_ENABLED='false';
    response=await fetch(base+'/api/oauth/authorize?'+supabaseParams,{redirect:'manual'});
    assert.deepEqual(await response.json(),{error:'invalid_request',reason:'provider_not_ready'});
    process.env.PROPULSE_OAUTH_ENABLED='true';
    response=await fetch(endpoint,{headers:{cookie:'propulse_auth=valid'},redirect:'manual'});
    assert.equal(response.status,200,'OAuth requires visible identity consent');
    const consent=await response.text();
    assert.match(consent,/Approve and continue/);
    const consentCsp=response.headers.get('content-security-policy') || '';
    assert.match(consentCsp,/frame-ancestors 'none'/);
    assert.match(consentCsp,/default-src 'none'/);
    assert.match(consentCsp,/base-uri 'none'/);
    assert.match(consentCsp,/object-src 'none'/);
    assert(!/\\bform-action\\b/.test(consentCsp),
      'Consent CSP must not block browser navigation through Supabase callback redirect chain');
    assert(!consentCsp.includes('unsafe-eval') && !consentCsp.includes('unsafe-forms'),
      'OAuth consent must not loosen script execution or allow unsafe forms');
    assert.equal(response.headers.get('referrer-policy'),'strict-origin',
      'OAuth consent GET must let browser form POST use the canonical Origin, not null');
    assert.equal(response.headers.get('cache-control'),'no-store',
      'OAuth approval page must never be cached');
    const approval=consent.match(/name="approval" value="([^"]+)"/)?.[1];
    assert.ok(approval);
    const authorize=(nonce, extra={})=>fetch(base+'/api/oauth/authorize',{
      method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',cookie:'propulse_auth=valid'},
      body:new URLSearchParams({...Object.fromEntries(params),approval:nonce,...extra}),redirect:'manual',
    });
    let rejected=await authorize('forged-consent');
    assert.equal(rejected.status,403,'unauthorized consent must fail');
    response=await authorize(approval);
    assert.equal(response.status,303);
    const redirect=new URL(response.headers.get('location'));
    assert.equal(redirect.origin,'https://testproject.supabase.co');
    assert.equal(redirect.searchParams.get('state'),'secure-state-value-1234');
    const code=redirect.searchParams.get('code');
    assert.ok(code && code.length>36);
    const basic='Basic '+Buffer.from(process.env.PROPULSE_OAUTH_CLIENT_ID+':'+process.env.PROPULSE_OAUTH_CLIENT_SECRET).toString('base64');
    const request=(authCode,proof=verifier,header=basic)=>fetch(base+'/api/oauth/token',{
      method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',authorization:header},
      body:new URLSearchParams({grant_type:'authorization_code',code:authCode,redirect_uri:process.env.PROPULSE_OAUTH_REDIRECT_URI,code_verifier:proof}),
    });
    response=await request(code);
    assert.equal(response.status,200,'PKCE exchange must succeed exactly once');
    const token=(await response.json()).access_token;
    assert.ok(token);
    response=await request(code);
    assert.equal(response.status,400,'replayed grant must fail');
    response=await fetch(base+'/api/oauth/userinfo',{headers:{authorization:'Bearer '+token}});
    const identity=await response.json();
    assert.equal(identity.email,'verified@example.test');
    assert.equal(identity.email_verified,true);
    assert.equal(identity.sub,'propulse:5');
    assert.ok(!identity.role,'legacy role must never leak to business identity');
    version=1;
    response=await fetch(base+'/api/oauth/userinfo',{headers:{authorization:'Bearer '+token}});
    assert.equal(response.status,401,'auth-version changes revoke tokens');
    version=0;
    response=await fetch(endpoint,{headers:{cookie:'propulse_auth=valid'},redirect:'manual'});
    assert.equal(response.status,200);
    const secondApproval=(await response.text()).match(/name="approval" value="([^"]+)"/)?.[1];
    assert.ok(secondApproval);
    response=await authorize(secondApproval);
    const secondCode=new URL(response.headers.get('location')).searchParams.get('code');
    response=await request(secondCode,'wrong-'+verifier);
    assert.equal(response.status,400,'PKCE mismatch must fail');
    verified=false;
    response=await fetch(endpoint,{headers:{cookie:'propulse_auth=valid'},redirect:'manual'});
    assert.equal(response.status,403,'unverified password-only account must fail closed');
    verified=true;
    const wrong=new URLSearchParams(params);wrong.set('redirect_uri','https://malicious.example/callback');
    response=await fetch(base+'/api/oauth/authorize?'+wrong,{headers:{cookie:'propulse_auth=valid'},redirect:'manual'});
    assert.equal(response.status,400,'redirect URI cannot change');
    active=false;
    response=await fetch(endpoint,{headers:{cookie:'propulse_auth=valid'},redirect:'manual'});
    assert.equal(response.status,401,'inactive user must fail');
    console.log('ProPulse OAuth security check: PASSED');
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(err=>{ console.error(err); process.exitCode=1; }).finally(()=>{
  restore.forEach(fn=>fn());
  for (const [k,v] of Object.entries(env)) { if(v===undefined) delete process.env[k];else process.env[k]=v; }
});
