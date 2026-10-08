const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {shouldSkipUnchangedSheet}=require('../src/utils/sheetSyncRetryPolicy');

const policy=overrides=>shouldSkipUnchangedSheet({
 force:false,previousFingerprint:'abc123',nextFingerprint:'abc123',lastFailed:0,...overrides
});
assert.equal(policy({}),true,'Successful unchanged sheets should remain cheap to check');
assert.equal(policy({lastFailed:0}),true);
assert.equal(policy({lastFailed:null}),true);
assert.equal(policy({lastFailed:1}),false,'One failed row requires a retry');
assert.equal(policy({lastFailed:'4'}),false,'Database string counts require retries');
assert.equal(policy({lastFailed:NaN}),false,'Unknown failure count should retry conservatively');
assert.equal(policy({force:true}),false,'Explicit manual resync must not skip');
assert.equal(policy({previousFingerprint:null}),false,'First sync requires processing');
assert.equal(policy({nextFingerprint:null}),false,'Unknown remote fingerprint cannot be skipped');
assert.equal(policy({nextFingerprint:'updated'}),false,'Changed sheet must be processed');

const root=path.join(__dirname,'../src/services');
const partner=fs.readFileSync(path.join(root,'leadPartnerInventoryCompatService.js'),'utf8');
const admin=fs.readFileSync(path.join(root,'adminGoogleSheetSyncService.js'),'utf8');

assert(partner.includes("require('../utils/sheetSyncRetryPolicy')"));
assert(partner.includes('shouldSkipUnchangedSheet({force,previousFingerprint:connection.fingerprint,nextFingerprint:analysis.fingerprint,lastFailed:connection.last_sync_failed})'),
  'Partner scheduled sync must retry unchanged sheets when the previous run had failures');
assert(admin.includes("require('../utils/sheetSyncRetryPolicy')"));
assert(admin.includes('previousFailed:connection.last_sync_failed'),
  'Admin connection sync must forward previous failed-row count');
assert(admin.includes('shouldSkipUnchangedSheet({force,previousFingerprint,nextFingerprint:fingerprint,lastFailed:previousFailed})'),
  'Admin scheduled sync must only skip error-free unchanged sheets');

assert(partner.includes('pg_try_advisory_lock')&&admin.includes('pg_try_advisory_lock'),
  'Existing advisory locks must remain intact');
console.log('Google Sheet failed-row retry policy regression tests passed.');
