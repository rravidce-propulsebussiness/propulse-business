const {decodeBase64Payload,validateDataUrlSignature}=require('./fileValidation');

const MAX_PROOF_BYTES=5*1024*1024;
const ALLOWED_PROOF_MIMES=Object.freeze(['image/png','image/jpeg','image/webp','application/pdf']);

// Shared upload boundary for manual payment and wallet top-up proofs.
// Keep the public payment and wallet error contracts separate from storage errors.
function checkProofDataUrl(value,{required=true,maxBytes=MAX_PROOF_BYTES}={}){
  if(typeof value!=='string'||!value.trim()){
    return required?{valid:false,reason:'missing'}:{valid:true};
  }
  const source=value.trim();
  // Check the encoded length before decoding untrusted content into a Buffer.
  const match=source.match(/^data:(image\/(?:png|jpeg|webp)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/i);
  if(!match)return{valid:false,reason:'format'};
  const payload=match[2];
  const padding=payload.endsWith('==')?2:payload.endsWith('=')?1:0;
  const length=Math.floor(payload.length*3/4)-padding;
  if(length<=0||length>maxBytes)return{valid:false,reason:'size'};
  const decoded=decodeBase64Payload(source);
  if(!decoded||decoded.data.length!==length||!decoded.data.length)return{valid:false,reason:'format'};
  if(!validateDataUrlSignature(source,ALLOWED_PROOF_MIMES))return{valid:false,reason:'signature'};
  return{valid:true};
}

function validatePaymentProof(value){
  const result=checkProofDataUrl(value);
  if(result.valid)return{valid:true};
  if(result.reason==='missing')return{valid:false,code:'PROOF_REQUIRED',message:'Payment proof is required'};
  if(result.reason==='size')return{valid:false,code:'PROOF_TOO_LARGE',message:'Payment proof must be 5 MB or smaller'};
  if(result.reason==='signature')return{valid:false,code:'INVALID_PROOF',message:'Payment proof content does not match its declared file type'};
  return{valid:false,code:'INVALID_PROOF',message:'Payment proof must be a PNG, JPEG, WebP, or PDF data file'};
}

function assertTopupProof(value){
  const result=checkProofDataUrl(value,{required:false});
  if(result.valid)return;
  throw Object.assign(new Error('Top-up proof must be a valid PNG, JPEG, WebP, or PDF file under 5 MB.'),{code:'INVALID_PROOF'});
}

module.exports={MAX_PROOF_BYTES,checkProofDataUrl,validatePaymentProof,assertTopupProof};
