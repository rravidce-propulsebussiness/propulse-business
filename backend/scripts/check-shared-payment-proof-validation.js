const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {MAX_PROOF_BYTES,checkProofDataUrl,validatePaymentProof,assertTopupProof}=
  require('../src/utils/paymentProofValidation');

const dataUrl=(mime,buffer)=>'data:'+mime+';base64,'+buffer.toString('base64');
const proofs=[
  dataUrl('image/png',Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0])),
  dataUrl('image/jpeg',Buffer.from([255,216,255,224,0,16])),
  dataUrl('image/webp',Buffer.from('RIFF0000WEBPVP8 ','ascii')),
  dataUrl('application/pdf',Buffer.from('%PDF-1.5\\n1 0 obj\\n','utf8'))
];
for(const proof of proofs){
  assert.deepEqual(validatePaymentProof(proof),{valid:true});
  assert.doesNotThrow(()=>assertTopupProof(proof));
}

assert.equal(MAX_PROOF_BYTES,5*1024*1024);
assert.equal(validatePaymentProof(null).code,'PROOF_REQUIRED');
assert.equal(validatePaymentProof('').code,'PROOF_REQUIRED');
assert.equal(validatePaymentProof('https://example.com/test.pdf').code,'INVALID_PROOF',
  'Manual payment proofs must not accept arbitrary external URLs');
assert.equal(validatePaymentProof('data:image/png;base64,???').code,'INVALID_PROOF');
assert.equal(validatePaymentProof('data:image/png;base64,'+Buffer.from('%PDF-1.5').toString('base64')).code,'INVALID_PROOF',
  'A file extension/MIME claim cannot override a mismatched magic header');
assert.equal(validatePaymentProof(dataUrl('image/gif',Buffer.from('GIF89a'))).code,'INVALID_PROOF');
assert.equal(validatePaymentProof(dataUrl('image/png',Buffer.alloc(MAX_PROOF_BYTES+1))).code,'PROOF_TOO_LARGE');
assert.deepEqual(checkProofDataUrl(null,{required:false}),{valid:true});
assert.deepEqual(checkProofDataUrl('',{required:false}),{valid:true});
assert.doesNotThrow(()=>assertTopupProof(null),'Wallet proof remains optional on manual top-up');
for(const invalid of ['https://example.com/test.pdf','data:image/png;base64,%%%','data:application/pdf;base64,AAAA']){
  assert.throws(()=>assertTopupProof(invalid),error=>error.code==='INVALID_PROOF');
}
assert.throws(()=>assertTopupProof(dataUrl('image/png',Buffer.alloc(MAX_PROOF_BYTES+1))),
  error=>error.code==='INVALID_PROOF','Keep existing wallet error contract');

const root=path.join(__dirname,'../src');
for(const [file,call] of [
  ['controllers/paymentController.js','validatePaymentProof(proofUrl)'],
  ['services/walletService.js','assertTopupProof(proofUrl)'],
  ['services/walletCouponService.js','assertTopupProof(proofUrl)']
]){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  assert(source.includes("require('../utils/paymentProofValidation')"),
    file+' must import the shared validator');
  assert(source.includes(call),file+' must use shared validation before proof storage');
  assert(!source.includes('function validateTopupProof(')&&!source.includes('function validatePaymentProof('),
    file+' must not duplicate proof validation');
}
console.log('Shared payment proof validation regression tests passed.');
