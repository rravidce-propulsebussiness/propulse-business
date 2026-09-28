const assert=require('assert');
const fs=require('fs');
const path=require('path');

function loadStorage(value){
  const modulePath=require.resolve('../src/config/uploadStorage');
  delete require.cache[modulePath];
  if(value===undefined) delete process.env.UPLOAD_STORAGE_ROOT;
  else process.env.UPLOAD_STORAGE_ROOT=value;
  return require(modulePath);
}

(async()=>{
  const original=process.env.UPLOAD_STORAGE_ROOT;
  const tempRoot=path.join('/tmp',`propulse-shared-uploads-${process.pid}`);
  try{
    const fallback=loadStorage(undefined);
    assert.strictEqual(fallback.uploadRoot,path.resolve(__dirname,'../uploads'),'Default upload root must preserve backend/uploads');
    const configured=loadStorage(tempRoot);
    assert.strictEqual(configured.uploadRoot,path.resolve(tempRoot),'Configured upload root must resolve to the mounted production directory');
    assert.strictEqual(configured.homepageUploadRoot,path.join(configured.uploadRoot,'homepage'));
    assert.strictEqual(configured.companyProofRoot,path.join(configured.uploadRoot,'company-proofs'));
    assert.strictEqual(configured.privateProofRoot,path.join(configured.uploadRoot,'private-proofs'));
    await configured.ensureUploadStorage();
    await configured.checkUploadStorage();
    await configured.probeUploadStorage();
    assert(fs.existsSync(configured.uploadRoot),'Startup storage check must create the configured root when the mount is writable');
    assert(!fs.readdirSync(configured.uploadRoot).some(name=>name.startsWith('.propulse-storage-probe-')),'Storage probe must clean up its temporary file');
    console.log('Upload storage root regression test passed.');
  }finally{
    await fs.promises.rm(tempRoot,{recursive:true,force:true}).catch(()=>{});
    if(original===undefined) delete process.env.UPLOAD_STORAGE_ROOT;
    else process.env.UPLOAD_STORAGE_ROOT=original;
  }
})().catch(error=>{console.error(error);process.exit(1)});
