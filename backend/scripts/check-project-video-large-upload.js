const assert=require('node:assert/strict');
const storage=require('../src/services/s3PrivateObjectStorageService');
const videos=require('../src/services/projectVideoService');

const originals=Object.fromEntries(
  ['assertWriteStorage','startMultipartUpload','completeMultipartUpload','abortMultipartUpload','headObject','getMediaGetUrl']
    .map(key=>[key,storage[key]])
);
const env={};
for(const key of ['PRIVATE_OBJECT_STORAGE_DRIVER','PRIVATE_OBJECT_STORAGE_ENDPOINT','PRIVATE_OBJECT_STORAGE_BUCKET',
  'PRIVATE_OBJECT_STORAGE_ACCESS_KEY_ID','PRIVATE_OBJECT_STORAGE_SECRET_ACCESS_KEY','PRIVATE_OBJECT_STORAGE_REGION']){
  env[key]=process.env[key];
}
Object.assign(process.env,{
  PRIVATE_OBJECT_STORAGE_DRIVER:'s3',
  PRIVATE_OBJECT_STORAGE_ENDPOINT:'https://example.r2.cloudflarestorage.com',
  PRIVATE_OBJECT_STORAGE_BUCKET:'propulse-files',
  PRIVATE_OBJECT_STORAGE_ACCESS_KEY_ID:'test-access-key',
  PRIVATE_OBJECT_STORAGE_SECRET_ACCESS_KEY:'test-secret-key',
  PRIVATE_OBJECT_STORAGE_REGION:'auto',
});

(async()=>{
  storage.assertWriteStorage=()=>true;
  storage.startMultipartUpload=async()=>'test-multipart-upload-id-123';
  storage.completeMultipartUpload=async(_key,_id,parts)=>{assert.equal(parts.length,4);return true};
  storage.abortMultipartUpload=async()=>true;
  storage.getMediaGetUrl=async()=> 'https://example.com/signed-video';

  const signed=storage.buildPresignedUploadUrl('business-projects/test.mp4',{contentType:'video/mp4'});
  const signedUrl=new URL(signed);
  assert.equal(signedUrl.searchParams.get('X-Amz-Algorithm'),'AWS4-HMAC-SHA256');
  assert.equal(signedUrl.searchParams.get('X-Amz-SignedHeaders'),'content-type;host');
  assert.match(signedUrl.searchParams.get('X-Amz-Signature'),/^[a-f0-9]{64}$/);

  const small=await videos.prepareVideoUpload(31,'video/mp4',80*1024*1024);
  assert.equal(small.mode,'single');
  assert.match(small.uploadUrl,/X-Amz-Signature=/);
  assert.match(small.reference,/business-projects\/31-/);

  const large=await videos.prepareVideoUpload(31,'video/webm',250*1024*1024);
  assert.equal(large.mode,'multipart');
  assert(large.chunkSize>=64*1024*1024);
  const part=videos.presignVideoPart(31,large.reference,large.uploadId,1);
  const url=new URL(part.uploadUrl);
  assert.equal(url.searchParams.get('partNumber'),'1');
  assert.equal(url.searchParams.get('uploadId'),large.uploadId);
  assert.throws(()=>videos.presignVideoPart(32,large.reference,large.uploadId,1));
  assert.throws(()=>videos.presignVideoPart(31,large.reference,large.uploadId,10001));
  storage.headObject=async()=>({size:250*1024*1024,contentType:'video/webm'});
  const parts=[1,2,3,4].map(partNumber=>({partNumber,etag:'"'+('a'.repeat(32))+'"'}));
  const complete=await videos.finishVideoUpload(31,{
    reference:large.reference,uploadId:large.uploadId,parts,mimeType:'video/webm',size:250*1024*1024,
  });
  assert.equal(complete.url,large.reference);
  assert.equal(complete.fileSize,250*1024*1024);
  assert.equal(complete.displayUrl,'https://example.com/signed-video');
  await assert.rejects(videos.finishVideoUpload(32,{
    reference:large.reference,uploadId:large.uploadId,parts,mimeType:'video/webm',size:250*1024*1024,
  }));
  assert.deepEqual(await videos.abortVideoUpload(31,{reference:large.reference,uploadId:large.uploadId}),{aborted:true});
  console.log('Project video direct-upload, multipart, upload completion and ownership checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{
  for(const [key,value] of Object.entries(originals))storage[key]=value;
  for(const [key,value] of Object.entries(env)){if(value===undefined)delete process.env[key];else process.env[key]=value}
});
