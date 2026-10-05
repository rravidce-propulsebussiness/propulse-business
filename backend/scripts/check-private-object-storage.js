const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const s3=require('../src/services/s3PrivateObjectStorageService');
const privateProof=read('src/services/privateProofStorageService.js');
const companyProof=read('src/services/companyProofStorageService.js');
const homepageMedia=read('src/services/homepageMediaService.js');
const leadReference=read('src/services/leadReferenceStorageService.js');
const projectVideo=read('src/services/projectVideoService.js');
const projectPlan=read('src/services/projectPlanService.js');
const projectMediaUtils=read('src/services/projectMediaStorageUtils.js');
const profileService=read('src/services/profileService.js');
const publicExpertService=read('src/services/publicExpertService.js');
const uploadStorage=read('src/config/uploadStorage.js');
const frontendCsp=read('../frontend/index.html');
const authService=read('src/services/authService.js');
const authController=read('src/controllers/authController.js');
const health=read('src/services/adminSystemHealthService.js');
const healthUi=read('../frontend/src/admin/pages/AdminSystemHealth.jsx');
const productionEnv=read('scripts/check-production-env.js');
const migration=read('scripts/migrate-private-uploads-to-object-storage.js');
const proofResponse=read('src/utils/proofResponse.js');
const legacyUploadMigration=read('src/services/legacyUploadMigrationService.js');
const server=read('src/server.js');
const privateStorageBackup=read('src/services/privateStorageBackupScheduler.js');

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

assert(privateProof.includes('s3.assertWriteStorage()')&&privateProof.includes('s3.makeReference(key)'),'Private payment/payout proofs must fail closed to object storage in production');
assert(companyProof.includes('s3.assertWriteStorage()'),'Company proof uploads must fail closed to object storage in production');
assert(homepageMedia.includes('s3.assertWriteStorage()'),'Homepage media uploads must fail closed to object storage in production');
assert(leadReference.includes('s3.assertWriteStorage()'),'Lead attachment uploads must fail closed to object storage in production');
assert(projectVideo.includes('s3.assertWriteStorage()'),'Project video uploads must fail closed to object storage in production');
assert(projectPlan.includes('s3.assertWriteStorage()'),'Project plan uploads must fail closed to object storage in production');
assert(privateProof.includes('s3.getSignedGetUrl(value)'),'Private proof reads must use short-lived signed URLs');
assert(privateProof.includes('s3.getObjectBuffer(key,{maxBytes})'),'Legacy materialization API must support S3 objects');
assert(companyProof.includes("key='company-proofs/'"),'Company verification documents must support private object storage');
assert(homepageMedia.includes("objectKey=\`homepage/\${filename}\`")&&homepageMedia.includes('s3.makeReference(objectKey)'),'Homepage media must support R2 writes');
assert(leadReference.includes("objectKey=\`lead-references/\${row.id}/\${filename}\`")&&leadReference.includes('s3.getObjectBuffer'),'Lead attachments must support R2 write/read');
assert(projectVideo.includes("key=\`business-projects/\${filename}\`")&&projectVideo.includes('displayUrl:await displayUrl(url)'),'Project videos must use stable R2 refs plus shared signed display URLs');
assert(projectPlan.includes("key=\`business-projects/\${filename}\`")&&projectPlan.includes('displayUrl:await displayUrl(url)'),'Project plans must use stable R2 refs plus shared signed display URLs');
assert(projectMediaUtils.includes("s3.getMediaGetUrl(stored,{expiresSeconds:3600})"),'Shared project media display URLs must use signed object-storage URLs');
assert(profileService.includes('video_display_url')&&profileService.includes('plan_display_url'),'Editable profiles must keep R2 storage refs separate from signed display URLs');
assert(publicExpertService.includes('materializeProjectMedia'),'Public expert APIs must materialize signed project media URLs');
assert(uploadStorage.includes('if(s3.isEnabled())')&&uploadStorage.includes('s3.probe()'),'Upload readiness must probe R2 when object storage is enabled');
assert(frontendCsp.includes("https://*.r2.cloudflarestorage.com")&&frontendCsp.includes("media-src 'self'"),'Frontend CSP must allow signed R2 images and videos');
assert(authService.includes('companyProofStorage.storeBuffer'),'Company proof uploads must use the storage abstraction');
assert(authController.includes('companyProofStorage.descriptor')&&authController.includes('sendProofDescriptor'),'Company proof downloads must use authorized storage descriptors');

assert(health.includes('privateObjectStorage.probe()'),'System Health must actively probe configured private object storage');
assert(healthUi.includes('Private objects'),'Admin System Health must show private object storage');
assert(productionEnv.includes('PRIVATE_OBJECT_STORAGE_DRIVER must be s3 in production'),'Production preflight must reject Hostinger/local upload storage');
assert(productionEnv.includes('PRIVATE_OBJECT_STORAGE_BACKUP_STRATEGY'),'Production preflight must require an explicit S3 backup strategy');
assert(productionEnv.includes('PRIVATE_OBJECT_STORAGE_SIGNED_URL_SECONDS must be an integer between 15 and 300'),'Production preflight must bound private signed URLs');
assert(migration.includes("process.argv.includes('--apply')"),'Historical private-object migration must be dry-run-first');
assert(migration.includes("payments")&&migration.includes("wallet_topups")&&migration.includes("lead_partner_payouts")&&migration.includes("investor_payout_requests")&&migration.includes("investments"),'Migration utility must cover all existing private-proof columns');
assert(migration.includes('company_proof_documents'),'Migration utility must cover legacy company-proof files');
assert(legacyUploadMigration.includes("stored_name NOT LIKE 'private-object-s3:%'")&&legacyUploadMigration.includes('companyProofStorage.storeBuffer'),'Startup legacy migration must move local company proofs into object storage');
assert(legacyUploadMigration.includes("../../uploads/company-proofs")&&legacyUploadMigration.includes('readLegacyCompanyProof'),'Legacy company proof migration must search both configured and original Hostinger upload roots');
assert(server.includes('migrateLegacyCompanyProofsToObjectStorage')&&server.includes('Legacy company proof migration'),'Server must attempt the idempotent legacy migration after object storage is ready');
assert(s3.headObject,'S3 abstraction must expose HEAD checks for cross-bucket verification');
assert(privateStorageBackup.includes("snapshots/")&&privateStorageBackup.includes('PRIVATE_OBJECT_STORAGE_BACKUP_BUCKET'),'Private R2 backup must prefer a dedicated backup bucket');
assert(privateStorageBackup.includes("mode:'locked_primary_prefix'")&&privateStorageBackup.includes("prefix:'backups/'"),'Scoped R2 credentials must fall back to the locked backups/ prefix instead of disabling backups');
assert(privateStorageBackup.includes('sha256(restored.buffer)')&&privateStorageBackup.includes('backup_verification_runs'),'Private R2 backup must verify restored bytes and persist verification state');
assert(proofResponse.includes("'Referrer-Policy','no-referrer'"),'Signed proof redirects must not leak their query token through referrers');

console.log('Private object storage abstraction regression test passed.');
