const path=require('path');
const fs=require('fs');
const s3=require('../services/s3PrivateObjectStorageService');

const configuredRoot=String(process.env.UPLOAD_STORAGE_ROOT||'').trim();
const uploadRoot=configuredRoot
  ? path.resolve(configuredRoot)
  : path.resolve(__dirname,'../../uploads');

const homepageUploadRoot=path.join(uploadRoot,'homepage');
const companyProofRoot=path.join(uploadRoot,'company-proofs');
const privateProofRoot=path.join(uploadRoot,'private-proofs');
const leadReferenceRoot=path.join(uploadRoot,'lead-references');
const businessProjectRoot=path.join(uploadRoot,'business-projects');

async function checkUploadStorage(){
  if(s3.isEnabled()){
    await s3.probe();
    return true;
  }
  await fs.promises.access(uploadRoot,fs.constants.R_OK|fs.constants.W_OK);
  return true;
}

async function probeUploadStorage(){
  if(s3.isEnabled()){
    await s3.probe();
    return true;
  }
  await fs.promises.mkdir(uploadRoot,{recursive:true,mode:0o700});
  const probe=path.join(uploadRoot,`.propulse-storage-probe-${process.pid}-${Date.now()}`);
  try{
    await fs.promises.writeFile(probe,'ok',{flag:'wx',mode:0o600});
    const value=await fs.promises.readFile(probe,'utf8');
    if(value!=='ok')throw new Error('Upload storage probe returned unexpected content');
  }finally{
    await fs.promises.unlink(probe).catch(error=>{if(error?.code!=='ENOENT')throw error});
  }
  return true;
}

async function ensureUploadStorage(){
  if(!s3.isEnabled())await fs.promises.mkdir(uploadRoot,{recursive:true,mode:0o700});
  await checkUploadStorage();
  return true;
}

module.exports={uploadRoot,homepageUploadRoot,companyProofRoot,privateProofRoot,leadReferenceRoot,businessProjectRoot,checkUploadStorage,probeUploadStorage,ensureUploadStorage};
