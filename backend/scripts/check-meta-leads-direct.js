const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const service=require('../src/services/metaLeadService');

const originalSecret=process.env.META_LEADS_APP_SECRET;
const originalVerify=process.env.META_LEADS_VERIFY_TOKEN;
try {
  process.env.META_LEADS_APP_SECRET='meta-test-secret';
  process.env.META_LEADS_VERIFY_TOKEN='meta-test-verify-token';
  const event=Buffer.from(JSON.stringify({object:'page',entry:[{id:'123456789123',changes:[{field:'leadgen',value:{leadgen_id:'123456789987',page_id:'123456789123'}}]}]}));
  const hmac=crypto.createHmac('sha256',process.env.META_LEADS_APP_SECRET).update(event).digest('hex');
  assert.equal(service.validSignature(event,'sha256='+hmac),true,'accept correct Meta SHA-256 signature');
  assert.equal(service.validSignature(Buffer.from('tampered'),'sha256='+hmac),false,'reject tampered body');
  assert.equal(service.validSignature(event,'sha256='+'0'.repeat(64)),false,'reject forged signature');
  assert.equal(service.validSignature(event,'sha1='+hmac),false,'reject legacy/incompatible signature');
  assert.equal(service.validChallenge({'hub.mode':'subscribe','hub.verify_token':'meta-test-verify-token'}),true);
  assert.equal(service.validChallenge({'hub.mode':'subscribe','hub.verify_token':'bad-token'}),false);
  assert.equal(service.validChallenge({'hub.mode':'unsubscribe','hub.verify_token':'meta-test-verify-token'}),false);
  const data=service.extractFields({field_data:[
    {name:'first_name',values:['Asha']},{name:'last_name',values:['Rao']},
    {name:'phone_number',values:['9876543210']},{name:'email',values:['asha@example.com']},
    {name:'city',values:['Hyderabad']}
  ]});
  assert.equal(data.name,'Asha Rao');
  assert.equal(data.phone,'9876543210');
  assert.equal(data.email,'asha@example.com');
  assert.deepEqual(data.fields.city,['Hyderabad']);
  const migration=fs.readFileSync(path.resolve(__dirname,'../src/database/migrations/20261108_meta_lead_ads_direct.sql'),'utf8');
  assert.match(migration,/meta_leadgen_id VARCHAR\(40\) NOT NULL UNIQUE/,'event deduplication must use Meta lead ID');
  assert.doesNotMatch(migration,/google_sheet/i,'Meta storage must be separate from Google Sheets');
  const server=fs.readFileSync(path.resolve(__dirname,'../src/server.js'),'utf8');
  assert.ok(server.indexOf("app.use('/api/meta-leads/webhook'")<server.indexOf("app.use(express.json({limit:DEFAULT_JSON_BYTES}))"),'signature verification must receive raw webhook bytes');
  const backend=fs.readFileSync(path.resolve(__dirname,'../src/services/metaLeadService.js'),'utf8');
  assert.doesNotMatch(backend,/INSERT INTO admin_google_sheet_connections|INSERT INTO lead_partner_sheet_connections/i);
  console.log('Meta Lead Ads direct integration checks passed.');
}finally{
  if(originalSecret===undefined)delete process.env.META_LEADS_APP_SECRET;else process.env.META_LEADS_APP_SECRET=originalSecret;
  if(originalVerify===undefined)delete process.env.META_LEADS_VERIFY_TOKEN;else process.env.META_LEADS_VERIFY_TOKEN=originalVerify;
}
