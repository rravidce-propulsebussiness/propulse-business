const privateProofStorage=require('./privateProofStorageService');
const {MAX_PROOF_BYTES}=require('../utils/paymentProofValidation');

function normalizeReference(value){
  return value==null?null:String(value).trim()||null;
}

function duplicateReferenceError(){
  return Object.assign(new Error('This payment reference / UTR has already been submitted'),{code:'DUPLICATE_REFERENCE'});
}

// This lock is shared across manual and coupon top-ups. The query is needed
// even when a database unique index has different casing/whitespace semantics.
async function lockReference(client,reference){
  if(!reference)return;
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`wallet-topup-reference:${reference.toLowerCase()}`]);
  const duplicate=(await client.query(
    'SELECT id FROM wallet_topups WHERE LOWER(BTRIM(reference))=LOWER(BTRIM($1)) LIMIT 1',
    [reference]
  )).rows[0];
  if(duplicate)throw duplicateReferenceError();
}

async function removeStoredProof(reference,context='Wallet top-up'){
  if(!reference)return;
  await privateProofStorage.removeStoredProof(reference).catch(error=>
    console.error(`${context} proof cleanup failed:`,error.message));
}

// Transaction is owned by the calling service. If the INSERT fails after an
// object upload, clean it here so the caller cannot lose the object reference.
async function insertPendingTopup(client,{userId,amount,reference,proofUrl,category='wallet-topups'}){
  let storedProof=null;
  try{
    storedProof=await privateProofStorage.storeDataUrl(proofUrl,{category,maxBytes:MAX_PROOF_BYTES});
    const topup=(await client.query(
      'INSERT INTO wallet_topups(user_id,amount,reference,proof_url) VALUES($1,$2,$3,$4) RETURNING *',
      [userId,amount,reference,storedProof||null]
    )).rows[0];
    return{topup,storedProof};
  }catch(error){
    await removeStoredProof(storedProof);
    if(error.code==='23505')throw duplicateReferenceError();
    throw error;
  }
}

module.exports={normalizeReference,lockReference,insertPendingTopup,removeStoredProof};
