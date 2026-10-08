const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');

const originalLoad=Module._load;
let calls=[];
let existingReference=false;
let failTopupInsert=false;
let failPaymentInsert=false;
let fileCounter=0;
const objects=new Set();
const png='data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,1]).toString('base64');

const storage={
  async storeDataUrl(proof,{category,maxBytes}){
    calls.push({operation:'store',category,maxBytes});
    if(!proof)return null;
    const reference='private-proof:'+category+'/test-'+(++fileCounter)+'.png';
    objects.add(reference);
    return reference;
  },
  async removeStoredProof(reference){calls.push({operation:'remove',reference});objects.delete(reference);}
};
const client={
  async query(sql,args=[]){
    calls.push({operation:'query',sql,args});
    if(['BEGIN','ROLLBACK','COMMIT'].includes(sql))return{rows:[]};
    if(sql.includes('pg_advisory_xact_lock'))return{rows:[]};
    if(sql.includes('SELECT id FROM wallet_topups WHERE LOWER(BTRIM(reference))'))
      return{rows:existingReference?[{id:17}]:[]};
    if(sql.includes('INSERT INTO wallet_topups(')){
      if(failTopupInsert)throw Object.assign(new Error('unique violation'),{code:'23505'});
      return{rows:[{id:41,user_id:args[0],amount:args[1],reference:args[2],proof_url:args[3]}]};
    }
    if(sql.includes('INSERT INTO payments(')){
      if(failPaymentInsert)throw new Error('Payment insert failed');
      return{rows:[{id:81,status:'pending'}]};
    }
    throw Error('Unexpected top-up query: '+sql.slice(0,110));
  },
  release(){calls.push({operation:'release'});}
};
const pool={connect:async()=>client,query:(...args)=>client.query(...args)};
const couponService={
  validateForUser:async({subtotal})=>({finalAmount:subtotal/2,discountAmount:subtotal/2,coupon:{id:11,code:'HALF'}}),
  reserveRedemption:async()=>({id:7})
};
const availability={requireOffline:async()=>{calls.push({operation:'requireOffline'});}};

Module._load=function(request,parent,isMain){
  const name=parent?.filename||'';
  if(name.endsWith(path.sep+'walletTopupSubmissionService.js')&&request==='./privateProofStorageService')return storage;
  if(name.endsWith(path.sep+'walletService.js')||name.endsWith(path.sep+'walletCouponService.js')){
    if(request==='../config/database')return pool;
    if(request==='./privateProofStorageService')return storage;
    if(request==='./paymentAvailabilityService')return availability;
    if(request==='./couponService')return couponService;
    if(request==='./notificationService')return{};
  }
  return originalLoad.apply(this,arguments);
};

(async()=>{
  try{
    const helper=require('../src/services/walletTopupSubmissionService');
    const wallet=require('../src/services/walletService');
    const coupons=require('../src/services/walletCouponService');
    assert.equal(helper.normalizeReference('  AbC  '),'AbC');
    assert.equal(helper.normalizeReference('   '),null);

    function reset(){calls=[];existingReference=false;failTopupInsert=false;failPaymentInsert=false;objects.clear();}
    const contains=query=>calls.some(x=>x.operation==='query'&&x.sql.includes(query));
    const queries=query=>calls.filter(x=>x.operation==='query'&&x.sql.includes(query));

    reset();
    const normal=await wallet.createTopup({userId:5,amount:'20.50',reference:'  UTR1  ',proofUrl:png});
    assert.equal(normal.reference,'UTR1');
    assert.equal(normal.amount,20.5);
    assert.equal(objects.size,1);
    assert.equal(queries('INSERT INTO wallet_topups(').length,1);
    assert.equal(queries('pg_advisory_xact_lock')[0].args[0],'wallet-topup-reference:utr1');
    assert.equal(queries('SELECT id FROM wallet_topups WHERE LOWER(BTRIM(reference))').length,1);
    assert(contains('COMMIT'));
    assert(calls.some(x=>x.operation==='requireOffline'));

    reset();
    const coupon=await coupons.createTopupWithCoupon({
      userId:5,amount:100,reference:' UTR2 ',proofUrl:png,couponCode:'HALF'
    });
    assert.equal(coupon.reference,'UTR2');
    assert.equal(coupon.payable_amount,50);
    assert.equal(coupon.payment_id,81);
    assert.equal(queries('INSERT INTO wallet_topups(').length,1);
    assert.equal(queries('INSERT INTO payments(').length,1);
    assert(contains('COMMIT'));
    assert.equal(objects.size,1);

    for(const run of [
      ()=>wallet.createTopup({userId:5,amount:10,reference:'utr1',proofUrl:png}),
      ()=>coupons.createTopupWithCoupon({userId:5,amount:10,reference:'utr1',proofUrl:png,couponCode:'HALF'})
    ]){
      reset();existingReference=true;
      await assert.rejects(run(),e=>e.code==='DUPLICATE_REFERENCE');
      assert.equal(objects.size,0,'Duplicate reference must not write a proof');
      assert.equal(queries('INSERT INTO wallet_topups(').length,0);
      assert(contains('ROLLBACK'));
    }

    for(const run of [
      ()=>wallet.createTopup({userId:5,amount:10,reference:'utr3',proofUrl:png}),
      ()=>coupons.createTopupWithCoupon({userId:5,amount:10,reference:'utr3',proofUrl:png,couponCode:'HALF'})
    ]){
      reset();failTopupInsert=true;
      await assert.rejects(run(),e=>e.code==='DUPLICATE_REFERENCE');
      assert.equal(objects.size,0,'Failed insert must remove its uploaded proof');
      assert(calls.some(x=>x.operation==='remove'));
      assert(contains('ROLLBACK'));
    }

    reset();failPaymentInsert=true;
    await assert.rejects(()=>coupons.createTopupWithCoupon({
      userId:5,amount:10,reference:'utr4',proofUrl:png,couponCode:'HALF'
    }),/Payment insert failed/);
    assert.equal(objects.size,0,'Failure after pending top-up insert must remove uploaded proof');
    assert(contains('ROLLBACK'));

    for(const file of ['walletService.js','walletCouponService.js']){
      const text=fs.readFileSync(path.join(__dirname,'../src/services',file),'utf8');
      assert(text.includes('topupSubmission.lockReference(client,normalizedReference)'),file+' must share UTR locking');
      assert(text.includes('topupSubmission.insertPendingTopup(client,'),file+' must share pending top-up insertion');
      assert(text.includes('topupSubmission.removeStoredProof(storedProof'),file+' must clean up after later failure');
    }
    console.log('Shared wallet top-up submission regression tests passed.');
  }finally{Module._load=originalLoad;}
})().catch(e=>{console.error(e);process.exitCode=1;});
