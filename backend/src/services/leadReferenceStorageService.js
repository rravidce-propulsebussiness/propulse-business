const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const pool=require('../config/database');
const {leadReferenceRoot}=require('../config/uploadStorage');
const {decodeBase64Payload,validateDataUrlSignature}=require('../utils/fileValidation');
const {validateSubmissionKey}=require('./publicContactValidationService');
const s3=require('./s3PrivateObjectStorageService');

const MAX_FILES=8;
const MAX_BYTES=5*1024*1024;
const ALLOWED_MIME=['image/jpeg','image/png','image/webp','application/pdf'];
const EXTENSIONS={
  'image/jpeg':'jpg',
  'image/png':'png',
  'image/webp':'webp',
  'application/pdf':'pdf',
};

function fail(message,code='INVALID_ATTACHMENT',status=400){
  const error=new Error(message);
  error.code=code;
  error.status=status;
  throw error;
}
function cleanName(value){
  return String(value||'file').trim().replace(/[\x00-\x1F\x7F]/g,'').slice(0,180)||'file';
}
function publicMeta(item){
  return {
    id:item.id,
    originalName:item.originalName,
    mime:item.mime,
    size:item.size,
    uploadedAt:item.uploadedAt,
  };
}
async function getLead(leadId){
  const id=Number(leadId);
  if(!Number.isInteger(id)||id<=0)fail('Invalid lead','INVALID_LEAD');
  const row=(await pool.query(
    `SELECT id,source,intake_submission_key,custom_fields
       FROM leads
      WHERE id=$1
      LIMIT 1`,
    [id]
  )).rows[0];
  if(!row)fail('Lead not found','LEAD_NOT_FOUND',404);
  return row;
}
function verifyOwner(row,key,submissionKey){
  const validKey=validateSubmissionKey(submissionKey);
  if(row.source!=='public_requirement')fail('Attachments are not allowed for this lead','ATTACHMENT_NOT_ALLOWED',403);
  if(String(row.intake_submission_key||'')!==validKey)fail('This request cannot be modified','ATTACHMENT_NOT_ALLOWED',403);
  const flowKey=String(row.custom_fields?._intake?.flowKey||'');
  if(flowKey&&flowKey!==String(key||''))fail('Requirement flow mismatch','ATTACHMENT_NOT_ALLOWED',403);
}
async function removeStored(storageKey){
  const value=String(storageKey||'');
  if(!value)return;
  if(s3.isReference(value)){
    await s3.deleteObject(s3.parseReference(value));
    return;
  }
  const absolute=path.resolve(leadReferenceRoot,value);
  if(!absolute.startsWith(path.resolve(leadReferenceRoot)+path.sep))return;
  await fs.promises.unlink(absolute).catch(error=>{if(error?.code!=='ENOENT')throw error});
}
async function saveReference({key,leadId,submissionKey,originalName,dataUrl,attachmentKey}){
  const row=await getLead(leadId);
  verifyOwner(row,key,submissionKey);

  const parsed=decodeBase64Payload(dataUrl);
  if(!parsed||!validateDataUrlSignature(dataUrl,ALLOWED_MIME))fail('Only JPG, PNG, WebP or PDF files are allowed','INVALID_ATTACHMENT');
  if(!parsed.data.length)fail('Attachment is empty','INVALID_ATTACHMENT');
  if(parsed.data.length>MAX_BYTES)fail('Each attachment must be 5 MB or smaller','ATTACHMENT_TOO_LARGE');

  const custom=row.custom_fields&&typeof row.custom_fields==='object'&&!Array.isArray(row.custom_fields)?row.custom_fields:{};
  const current=Array.isArray(custom._reference_files)?custom._reference_files:[];
  const safeAttachmentKey=String(attachmentKey||'').trim().slice(0,240);
  if(safeAttachmentKey){
    const duplicate=current.find(item=>item.attachmentKey===safeAttachmentKey);
    if(duplicate)return{accepted:true,duplicate:true,attachment:publicMeta(duplicate)};
  }
  if(current.length>=MAX_FILES)fail('You can upload up to 8 reference files','ATTACHMENT_LIMIT');

  const id=crypto.randomUUID();
  const extension=EXTENSIONS[parsed.mime];
  const filename=`${Date.now()}-${crypto.randomBytes(12).toString('hex')}.${extension}`;
  let storageKey;
  const useObjectStorage=s3.assertWriteStorage();
  if(useObjectStorage){
    const objectKey=`lead-references/${row.id}/${filename}`;
    await s3.putObject(objectKey,parsed.data,{contentType:parsed.mime});
    storageKey=s3.makeReference(objectKey);
  }else{
    const folder=path.join(leadReferenceRoot,String(row.id));
    await fs.promises.mkdir(folder,{recursive:true,mode:0o700});
    const destination=path.join(folder,filename);
    await fs.promises.writeFile(destination,parsed.data,{flag:'wx',mode:0o600});
    storageKey=`${row.id}/${filename}`;
  }
  const item={
    id,
    attachmentKey:safeAttachmentKey||id,
    originalName:cleanName(originalName),
    mime:parsed.mime,
    size:parsed.data.length,
    storageKey,
    uploadedAt:new Date().toISOString(),
  };
  const nextCustom={...custom,_reference_files:[...current,item]};
  try{
    await pool.query(
      `UPDATE leads
          SET custom_fields=$1,
              updated_at=CURRENT_TIMESTAMP
        WHERE id=$2`,
      [JSON.stringify(nextCustom),row.id]
    );
  }catch(error){
    await removeStored(storageKey).catch(()=>{});
    throw error;
  }
  return{accepted:true,duplicate:false,attachment:publicMeta(item),count:nextCustom._reference_files.length};
}
async function getAdminReference({leadId,attachmentId}){
  const row=await getLead(leadId);
  const files=Array.isArray(row.custom_fields?._reference_files)?row.custom_fields._reference_files:[];
  const item=files.find(file=>String(file.id)===String(attachmentId));
  if(!item)fail('Attachment not found','ATTACHMENT_NOT_FOUND',404);
  const stored=String(item.storageKey||'');
  if(s3.isReference(stored)){
    const result=await s3.getObjectBuffer(s3.parseReference(stored),{maxBytes:MAX_BYTES});
    return{buffer:result.buffer,mime:item.mime||result.contentType||'application/octet-stream',name:cleanName(item.originalName),meta:publicMeta(item)};
  }
  const expectedPrefix=String(row.id)+'/';
  if(!stored.startsWith(expectedPrefix))fail('Attachment path is invalid','ATTACHMENT_NOT_FOUND',404);
  const absolute=path.resolve(leadReferenceRoot,stored);
  const root=path.resolve(leadReferenceRoot)+path.sep;
  if(!absolute.startsWith(root))fail('Attachment path is invalid','ATTACHMENT_NOT_FOUND',404);
  await fs.promises.access(absolute,fs.constants.R_OK);
  return{path:absolute,mime:item.mime||'application/octet-stream',name:cleanName(item.originalName),meta:publicMeta(item)};
}
module.exports={MAX_FILES,MAX_BYTES,saveReference,getAdminReference};
