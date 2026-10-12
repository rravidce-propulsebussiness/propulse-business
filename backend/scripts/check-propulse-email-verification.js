/* Isolated email ownership verification security regressions — no external API or real database. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');

const restoreModules=[];
function replace(relative, exported) {
  const location=require.resolve(path.resolve(__dirname,relative));
  const original=require.cache[location];
  require.cache[location]={id:location,filename:location,loaded:true,exports:exported};
  restoreModules.push(()=>{if(original)require.cache[location]=original;else delete require.cache[location]});
}
const user={id:99,name:'Test User',email:'verified@example.test',auth_version:0,email_verified_at:null,is_active:true};
const issued=new Map();
let lastEmail=null;
const pool={
  async query(sql, values){
    if(sql.startsWith('SELECT id,name,email,auth_version,email_verified_at')) {
      return {rows:values[0]===user.id&&user.is_active?[{...user}]:[]};
    }
    if(sql.startsWith('DELETE FROM propulse_email_verification_tokens WHERE user_id')) {
      for(const [key,t] of issued)if(t.user_id===values[0])issued.delete(key);
      return {rows:[]};
    }
    if(sql.startsWith('INSERT INTO propulse_email_verification_tokens')) {
      issued.set(values[0],{token_hash:values[0],user_id:values[1],
        email_address:values[2],auth_version:values[3],expires_at:Date.now()+1800000});
      return {rows:[]};
    }
    if(sql.startsWith('WITH consumed AS')) {
      const entry=issued.get(values[0]);
      if(!entry||entry.expires_at<Date.now())return {rows:[]};
      issued.delete(values[0]);
      if(!user.is_active||user.auth_version!==entry.auth_version ||
        user.email.toLowerCase()!==entry.email_address)return {rows:[]};
      user.email_verified_at=new Date();
      return {rows:[{id:user.id}]};
    }
    if(sql.startsWith('DELETE FROM propulse_email_verification_tokens WHERE token_hash')) {
      issued.delete(values[0]);
      return {rows:[]};
    }
    throw Error('Unexpected verification SQL: '+sql.slice(0,85));
  }
};
replace('../src/config/database',pool);
replace('../src/services/emailService',{sendEmailVerificationEmail:async v=>{lastEmail=v;return{id:'test-mail'}}});
const controller=require('../src/controllers/emailVerificationController');
async function test() {
  const app=express();
  app.use(express.urlencoded({extended:false}));
  app.use((req,_res,next)=>{req.user={id:user.id};next()});
  app.get('/api/auth/email-verification',controller.showRequest);
  app.post('/api/auth/email-verification/request',controller.request);
  app.get('/api/auth/email-verification/confirm',controller.showConfirm);
  app.post('/api/auth/email-verification/confirm',controller.confirm);
  const server=app.listen(0,'127.0.0.1');
  await new Promise(ok=>server.once('listening',ok));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    let response=await fetch(base+'/api/auth/email-verification');
    assert.equal(response.status,200);
    assert.match(await response.text(),/Send verification email/);
    response=await fetch(base+'/api/auth/email-verification/request',{method:'POST'});
    assert.equal(response.status,200);
    assert.ok(lastEmail?.verificationUrl);
    assert.equal(lastEmail.to,user.email);
    assert.equal(issued.size,1);
    let verification=new URL(lastEmail.verificationUrl);
    assert.equal(verification.origin,'https://propulsetechnologies.online');
    const token=verification.searchParams.get('token');
    assert.ok(token?.length===43);
    assert.equal(issued.has(crypto.createHash('sha256').update(token).digest('hex')),true);
    response=await fetch(base+verification.pathname+verification.search);
    assert.equal(response.status,200);
    assert.match(await response.text(),/Verify my email/);
    assert.equal(user.email_verified_at,null,'mail scanner GET must never mark verified');
    response=await fetch(base+'/api/auth/email-verification/confirm',{method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({token:token.slice(0,-1)+'_'})});
    assert.equal(response.status,400);
    assert.equal(user.email_verified_at,null);
    response=await fetch(base+'/api/auth/email-verification/confirm',{method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({token})});
    assert.equal(response.status,200);
    assert.ok(user.email_verified_at,'explicit POST verifies account');
    response=await fetch(base+'/api/auth/email-verification/confirm',{method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({token})});
    assert.equal(response.status,400,'verification token must be single-use');
    user.email_verified_at=null;
    response=await fetch(base+'/api/auth/email-verification/request',{method:'POST'});
    assert.equal(response.status,200);
    verification=new URL(lastEmail.verificationUrl);
    user.auth_version+=1;
    response=await fetch(base+'/api/auth/email-verification/confirm',{method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({token:verification.searchParams.get('token')})});
    assert.equal(response.status,400,'revoked account session invalidates verification');
    assert.equal(user.email_verified_at,null);
    user.auth_version-=1;
    response=await fetch(base+'/api/auth/email-verification/request',{method:'POST'});
    assert.equal(response.status,200);
    verification=new URL(lastEmail.verificationUrl);
    user.email='changed@example.test';
    response=await fetch(base+'/api/auth/email-verification/confirm',{method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({token:verification.searchParams.get('token')})});
    assert.equal(response.status,400,'changed account email invalidates original token');
    assert.equal(user.email_verified_at,null);
    console.log('Email verification security check: PASSED');
  }finally{
    await new Promise(ok=>server.close(ok));
  }
}
test().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>restoreModules.forEach(fn=>fn()));
