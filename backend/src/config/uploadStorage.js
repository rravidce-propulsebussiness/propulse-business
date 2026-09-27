const path=require('path');

const configuredRoot=String(process.env.UPLOAD_STORAGE_ROOT||'').trim();
const uploadRoot=configuredRoot
  ? path.resolve(configuredRoot)
  : path.resolve(__dirname,'../../uploads');

const homepageUploadRoot=path.join(uploadRoot,'homepage');
const companyProofRoot=path.join(uploadRoot,'company-proofs');
const privateProofRoot=path.join(uploadRoot,'private-proofs');

module.exports={uploadRoot,homepageUploadRoot,companyProofRoot,privateProofRoot};
