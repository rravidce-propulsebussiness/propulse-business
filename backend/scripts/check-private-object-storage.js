const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const s3=require('../src/services/s3PrivateObjectStorageService');
const privateProof=read('src/services/privateProofStorageService.js');
const companyProof=read('src/services/companyProofStorageService.js');
const authService=read('src/services/authService.js');
const authController=read('src/controllers/authController.js');
const health=read('src/services/adminSystemHealthService.js');
const healthUi=read('../frontend/src/admin/pages/AdminSystemHealth.jsx');
const productionEnv=read('scripts/check-production-env.js');
const migration=read('scripts/migrate-private-uploads-to-object-storage.js');
const proofResponse=read('src/utils/proofResponse.js');

const signed=s3.buildPresignedGetUrl('test.txt',{
  expiresSeconds:86400,
  now:new Date('2013-05-24T00:00:00Z'),
  configOverride:{
    endpoint:'https://s3.amazonaws.com',
    region:'us-east-1',
    bucket:'examplebucket',
    accessKeyId:'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey:'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    forcePathStyle:false
  }
});
assert(signed.includes('X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404'),'SigV4 presigning must match the published AWS S3 example');
assert(signed.startsWith('https://examplebucket.s3.amazonaws.com/test.txt?'),'Virtual-hosted S3 URL construction is incorrect');

assert(privateProof.includes('s3.isEnabled()')&&privateProof.includes('s3.makeReference(key)'),'Private payment/payout proofs must support S3 writes');
assert(privateProof.includes('s3.getSignedGetUrl(value)'),'Private proof reads must use short-lived signed URLs');
assert(privateProof.includes('s3.getObjectBuffer(key,{maxBytes})'),'Legacy materialization API must support S3 objects');
assert(companyProof.includes("key='company-proofs/'"),'Company verification documents must support private object storage');
assert(authService.includes('companyProofStorage.storeBuffer'),'Company proof uploads must use the storage abstraction');
assert(authController.includes('companyProofStorage.descriptor')&&authController.includes('sendProofDescriptor'),'Company proof downloads must use authorized storage descriptors');

assert(health.includes('privateObjectStorage.probe()'),'System Health must actively probe configured private object storage');
assert(healthUi.includes('Private objects'),'Admin System Health must show private object storage');
assert(productionEnv.includes('PRIVATE_OBJECT_STORAGE_BACKUP_STRATEGY'),'Production preflight must require an explicit S3 backup strategy');
assert(productionEnv.includes('PRIVATE_OBJECT_STORAGE_SIGNED_URL_SECONDS must be an integer between 15 and 300'),'Production preflight must bound private signed URLs');
assert(migration.includes("process.argv.includes('--apply')"),'Historical private-object migration must be dry-run-first');
assert(migration.includes("payments")&&migration.includes("wallet_topups")&&migration.includes("lead_partner_payouts")&&migration.includes("investor_payout_requests")&&migration.includes("investments"),'Migration utility must cover all existing private-proof columns');
assert(migration.includes('company_proof_documents'),'Migration utility must cover legacy company-proof files');
assert(proofResponse.includes("'Referrer-Policy','no-referrer'"),'Signed proof redirects must not leak their query token through referrers');

console.log('Private object storage abstraction regression test passed.');
