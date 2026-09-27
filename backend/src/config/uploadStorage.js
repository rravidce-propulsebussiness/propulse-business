const path=require('path');
const fs=require('fs');

const configuredRoot=String(process.env.UPLOAD_STORAGE_ROOT||'').trim();
const uploadRoot=configuredRoot
  ? path.resolve(configuredRoot)
  : path.resolve(__dirname,'../../uploads');

const homepageUploadRoot=path.join(uploadRoot,'homepage');
const companyProofRoot=path.join(uploadRoot,'company-proofs');
const privateProofRoot=path.join(uploadRoot,'private-proofs');

async function checkUploadStorage(){
  await fs.promises.access(uploadRoot,fs.constants.R_OK|fs.constants.W_OK);
  return true;
}

async function ensureUploadStorage(){
  await fs.promises.mkdir(uploadRoot,{recursive:true,mode:0o700});
  return checkUploadStorage();
}

module.exports={uploadRoot,homepageUploadRoot,companyProofRoot,privateProofRoot,checkUploadStorage,ensureUploadStorage};
