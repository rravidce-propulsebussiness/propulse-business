process.env.PRIVATE_OBJECT_STORAGE_DRIVER='s3';
process.env.PRIVATE_OBJECT_STORAGE_ENDPOINT='https://objects.example.test';
process.env.PRIVATE_OBJECT_STORAGE_REGION='us-east-1';
process.env.PRIVATE_OBJECT_STORAGE_BUCKET='propulse-private';
process.env.PRIVATE_OBJECT_STORAGE_ACCESS_KEY_ID='test-access-key';
process.env.PRIVATE_OBJECT_STORAGE_SECRET_ACCESS_KEY='test-secret-key';
process.env.PRIVATE_OBJECT_STORAGE_FORCE_PATH_STYLE='true';
process.env.PRIVATE_OBJECT_STORAGE_SIGNED_URL_SECONDS='60';

const assert=require('assert');
const pool=require('../src/config/database');
const s3=require('../src/services/s3PrivateObjectStorageService');
const privateProof=require('../src/services/privateProofStorageService');
const companyProofStorage=require('../src/services/companyProofStorageService');
const authService=require('../src/services/authService');
const projectVideo=require('../src/services/projectVideoService');
const projectPlan=require('../src/services/projectPlanService');

const objects=new Map();
const types=new Map();
global.fetch=async(input,options={})=>{
  const url=new URL(String(input));
  const key=url.pathname;
  const method=String(options.method||'GET').toUpperCase();
  if(method==='PUT'){
    const body=Buffer.isBuffer(options.body)?options.body:Buffer.from(options.body||'');
    objects.set(key,Buffer.from(body));
    types.set(key,String(options.headers?.['content-type']||options.headers?.get?.('content-type')||'application/octet-stream'));
    return new Response('',{status:200});
  }
  if(method==='DELETE'){
    objects.delete(key);types.delete(key);
    return new Response(null,{status:204});
  }
  if(method==='GET'){
    const body=objects.get(key);
    if(!body)return new Response('not found',{status:404});
    return new Response(body,{status:200,headers:{'content-type':types.get(key)||'application/octet-stream','content-length':String(body.length)}});
  }
  return new Response('unsupported',{status:405});
};

(async()=>{
  const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
  const dataUrl='data:image/png;base64,'+png.toString('base64');

  const proofRef=await privateProof.storeDataUrl(dataUrl,{category:'runtime-test',maxBytes:1024});
  assert(s3.isReference(proofRef),'New private proof must use an opaque S3 reference');
  const descriptor=await privateProof.getProofDescriptor(proofRef,{maxBytes:1024});
  assert(descriptor.externalUrl.includes('X-Amz-Signature='),'Private proof descriptor must expose only a signed GET URL');
  assert(descriptor.externalUrl.includes('X-Amz-Expires=60'),'Private proof signed URL must use the configured short expiry');
  assert.strictEqual(await privateProof.materializeProof(proofRef,{maxBytes:1024}),dataUrl,'S3-backed proof materialization must preserve the legacy data URL contract');

  const suffix=Date.now();
  const user=(await pool.query("INSERT INTO users(name,email,password_hash,role,is_active) VALUES($1,$2,'x','business',TRUE) RETURNING id",['Object Storage CI','object-storage-'+suffix+'@example.test'])).rows[0];
  const saved=await authService.saveCompanyProofDocuments(user.id,[{name:'proof.png',type:'image/png',data:dataUrl}]);
  assert(saved.length===1,'Company proof upload should persist one document');
  const row=(await pool.query('SELECT id,stored_name,mime_type,file_size FROM company_proof_documents WHERE id=$1',[saved[0].id])).rows[0];
  assert(s3.isReference(row.stored_name),'Company proof DB row must store only an opaque object reference');
  const companyDescriptor=await companyProofStorage.descriptor(row.stored_name,{mimeType:row.mime_type,size:row.file_size});
  assert(companyDescriptor.externalUrl.includes('X-Amz-Signature='),'Company proof reads must use a signed object URL');

  const mp4=Buffer.concat([Buffer.alloc(4),Buffer.from('ftyp'),Buffer.alloc(12)]);
  const video=await projectVideo.saveProjectVideo(user.id,'video/mp4',mp4);
  assert(s3.isReference(video.url),'Project video must store an opaque R2 reference');
  assert(video.displayUrl.includes('X-Amz-Signature='),'Project video upload must return a signed display URL');
  assert(video.displayUrl.includes('X-Amz-Expires=3600'),'Project video display URL must use the media expiry');
  assert.strictEqual(projectVideo.managedVideoInfo(user.id,video.url).provider,'s3','Project video ownership parser must recognize R2');
  assert.throws(()=>projectVideo.managedVideoInfo(user.id+1,video.url),/does not belong/,'Project video reference must enforce owner isolation');

  const pdf=Buffer.from('%PDF-1.4\nR2 runtime plan\n');
  const plan=await projectPlan.saveProjectPlan(user.id,'application/pdf',pdf);
  assert(s3.isReference(plan.url),'Project plan must store an opaque R2 reference');
  assert(plan.displayUrl.includes('X-Amz-Signature='),'Project plan upload must return a signed display URL');
  assert.strictEqual(projectPlan.managedPlanInfo(user.id,plan.url).provider,'s3','Project plan ownership parser must recognize R2');

  await projectVideo.removeManagedProjectVideos(user.id,[video.url]);
  await projectPlan.removeManagedProjectPlans(user.id,[plan.url]);

  await privateProof.removeStoredProof(proofRef);
  assert(objects.size>=1,'Removing one proof must not remove unrelated company proof objects');
  await companyProofStorage.remove(row.stored_name);
  await pool.query('DELETE FROM users WHERE id=$1',[user.id]);
  assert(objects.size===0,'Runtime test must clean up all mocked private objects');

  console.log('Private object storage PostgreSQL/runtime smoke passed.');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1}).finally(()=>pool.end());
