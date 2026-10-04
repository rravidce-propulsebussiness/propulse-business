require('dotenv').config();
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {uploadRoot,ensureUploadStorage}=require('../src/config/uploadStorage');
const s3=require('../src/services/s3PrivateObjectStorageService');
const {
  backupRoot,timestamp,buildCommit,ensurePrivateDirectory,sha256File,ensureBackupVerificationSchema,recordVerification
}=require('./backup-common');

function isWithin(parent,child){
  const relative=path.relative(path.resolve(parent),path.resolve(child));
  return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));
}
async function walkAndCopy(sourceRoot,destinationRoot,current=''){
  const source=path.join(sourceRoot,current);
  const entries=await fs.promises.readdir(source,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    if(entry.name.startsWith('.propulse-storage-probe-'))continue;
    const relative=path.join(current,entry.name);
    const sourcePath=path.join(sourceRoot,relative);
    const destinationPath=path.join(destinationRoot,relative);
    if(entry.isSymbolicLink())throw new Error('Upload storage contains a symbolic link and cannot be safely snapshotted: '+relative);
    if(entry.isDirectory()){
      await fs.promises.mkdir(destinationPath,{recursive:true,mode:0o700});
      files.push(...await walkAndCopy(sourceRoot,destinationRoot,relative));
      continue;
    }
    if(!entry.isFile())throw new Error('Upload storage contains an unsupported filesystem entry: '+relative);
    await fs.promises.mkdir(path.dirname(destinationPath),{recursive:true,mode:0o700});
    await fs.promises.copyFile(sourcePath,destinationPath,fs.constants.COPYFILE_EXCL);
    await fs.promises.chmod(destinationPath,0o600).catch(()=>{});
    const stat=await fs.promises.stat(destinationPath);
    const sha256=await sha256File(destinationPath);
    files.push({path:relative.split(path.sep).join('/'),bytes:stat.size,sha256});
  }
  return files;
}
async function verifySnapshot(snapshotRoot,files){
  for(const file of files){
    const target=path.join(snapshotRoot,...file.path.split('/'));
    const stat=await fs.promises.stat(target);
    if(stat.size!==file.bytes)throw new Error('Private-storage snapshot size mismatch: '+file.path);
    const hash=await sha256File(target);
    if(hash!==file.sha256)throw new Error('Private-storage snapshot hash mismatch: '+file.path);
  }
}
async function backupPrivateStorage(){
  const startedAt=new Date().toISOString();
  let artifactName=null;
  let artifactHash=null;
  let totalBytes=null;
  let finalRoot=null;
  let partialRoot=null;
  try{
    await ensureBackupVerificationSchema();
    if(s3.isEnabled()){
      const strategy=String(process.env.PRIVATE_OBJECT_STORAGE_BACKUP_STRATEGY||'').trim().toLowerCase();
      if(!['bucket_versioning','replication','external_backup'].includes(strategy))throw new Error('PRIVATE_OBJECT_STORAGE_BACKUP_STRATEGY must be configured for R2/S3 storage backups');
      const health=await s3.probe();
      const cfg=s3.config();
      artifactName=`s3://${cfg.bucket}`;
      const verification=await recordVerification({
        backupType:'private_storage',
        status:'verified',
        artifactName,
        metrics:{provider:'s3',bucket:cfg.bucket,strategy,probeStatus:health.status},
        startedAt
      });
      console.log(`Object storage backup strategy verified: run #${verification.id}.`);
      console.log('Bucket:',cfg.bucket,'Strategy:',strategy);
      return{...verification,provider:'s3',bucket:cfg.bucket,strategy};
    }
    await ensureUploadStorage();
    const configured=String(process.env.PRIVATE_STORAGE_BACKUP_DIRECTORY||'').trim();
    const destinationBase=await ensurePrivateDirectory(path.resolve(configured||path.join(backupRoot(),'private-storage')));
    if(isWithin(uploadRoot,destinationBase))throw new Error('PRIVATE_STORAGE_BACKUP_DIRECTORY must not be inside UPLOAD_STORAGE_ROOT');

    artifactName=`propulse-uploads-${timestamp()}-${buildCommit().replace(/[^A-Za-z0-9._-]/g,'_').slice(0,24)}`;
    finalRoot=path.join(destinationBase,artifactName);
    partialRoot=finalRoot+'.partial';
    await fs.promises.rm(partialRoot,{recursive:true,force:true});
    await fs.promises.mkdir(partialRoot,{recursive:true,mode:0o700});

    const files=(await walkAndCopy(uploadRoot,partialRoot)).sort((a,b)=>a.path.localeCompare(b.path));
    await verifySnapshot(partialRoot,files);
    totalBytes=files.reduce((sum,file)=>sum+file.bytes,0);
    artifactHash=crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex');
    const manifest={
      version:1,
      createdAt:new Date().toISOString(),
      buildCommit:buildCommit(),
      artifact:{directory:artifactName,fileCount:files.length,bytes:totalBytes,sha256:artifactHash},
      files
    };
    await fs.promises.writeFile(path.join(partialRoot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
    await fs.promises.rename(partialRoot,finalRoot);
    partialRoot=null;

    const verification=await recordVerification({
      backupType:'private_storage',
      status:'verified',
      artifactName,
      artifactSha256:artifactHash,
      artifactSizeBytes:totalBytes,
      metrics:{fileCount:files.length,totalBytes},
      startedAt
    });
    console.log(`Private upload storage backup verified: run #${verification.id}.`);
    console.log('Snapshot:',finalRoot);
    console.log('Files:',files.length,'Bytes:',totalBytes);
    return{...verification,snapshotRoot:finalRoot,fileCount:files.length,totalBytes};
  }catch(error){
    if(partialRoot)await fs.promises.rm(partialRoot,{recursive:true,force:true}).catch(()=>{});
    await recordVerification({
      backupType:'private_storage',
      status:'failed',
      artifactName,
      artifactSha256:artifactHash,
      artifactSizeBytes:totalBytes,
      metrics:{},
      errorMessage:error.message,
      startedAt
    }).catch(()=>{});
    throw error;
  }
}

if(require.main===module){
  backupPrivateStorage().catch(error=>{console.error(error.stack||error);process.exitCode=1});
}

module.exports={backupPrivateStorage};
