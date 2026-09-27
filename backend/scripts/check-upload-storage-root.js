const assert=require('assert');
const path=require('path');

function loadStorage(value){
  const modulePath=require.resolve('../src/config/uploadStorage');
  delete require.cache[modulePath];
  if(value===undefined) delete process.env.UPLOAD_STORAGE_ROOT;
  else process.env.UPLOAD_STORAGE_ROOT=value;
  return require(modulePath);
}

const original=process.env.UPLOAD_STORAGE_ROOT;
try{
  const fallback=loadStorage(undefined);
  assert.strictEqual(fallback.uploadRoot,path.resolve(__dirname,'../uploads'),'Default upload root must preserve backend/uploads');
  const configured=loadStorage('/tmp/propulse-shared-uploads');
  assert.strictEqual(configured.uploadRoot,path.resolve('/tmp/propulse-shared-uploads'),'Configured upload root must resolve to the mounted production directory');
  assert.strictEqual(configured.homepageUploadRoot,path.join(configured.uploadRoot,'homepage'));
  assert.strictEqual(configured.companyProofRoot,path.join(configured.uploadRoot,'company-proofs'));
  assert.strictEqual(configured.privateProofRoot,path.join(configured.uploadRoot,'private-proofs'));
  console.log('Upload storage root regression test passed.');
}finally{
  if(original===undefined) delete process.env.UPLOAD_STORAGE_ROOT;
  else process.env.UPLOAD_STORAGE_ROOT=original;
}
