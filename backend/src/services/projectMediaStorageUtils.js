const s3=require('./s3PrivateObjectStorageService');

function normalizeMime(value){
  return String(value||'').split(';')[0].trim().toLowerCase();
}

async function displayUrl(value){
  const stored=String(value||'').trim();
  if(!stored)return '';
  if(s3.isReference(stored))return s3.getMediaGetUrl(stored,{expiresSeconds:3600});
  return stored;
}

module.exports={normalizeMime,displayUrl};
