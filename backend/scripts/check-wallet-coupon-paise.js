const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');

const originalLoad=Module._load;
let connections=0;
let subtotal=null;
let beginCount=0;
let rollbackCount=0;
const sentinel=Object.assign(new Error('Mock coupon preview completed'),{code:'MOCK_COUPON_PREVIEW'});
const client={
  async query(sql){
    if(sql==='BEGIN'){beginCount++;return{rows:[]};}
    if(sql==='ROLLBACK'){rollbackCount++;return{rows:[]};}
    throw new Error('Unexpected query in coupon amount test: '+sql.slice(0,90));
  },
  release(){}
};
Module._load=function(request,parent,isMain){
  if((parent?.filename||'').endsWith(path.sep+'walletCouponService.js')){
    if(request==='../config/database')return{connect:async()=>{connections++;return client;}};
    if(request==='./couponService')return{validateForUser:async(args)=>{subtotal=args.subtotal;throw sentinel;}};
    if(request==='./privateProofStorageService')return{};
    if(request==='./paymentAvailabilityService')return{};
  }
  return originalLoad.apply(this,arguments);
};
(async()=>{
  try{
    const service=require('../src/services/walletCouponService');
    async function topup(amount){
      return service.createTopupWithCoupon({userId:1,amount,couponCode:'TEST',proofUrl:null});
    }

    await assert.rejects(()=>topup('0.001'),error=>error.code==='INVALID_AMOUNT');
    assert.equal(connections,0,'A sub-paise amount rounded to zero must fail before opening a transaction');

    await assert.rejects(()=>topup('10.005'),error=>error===sentinel);
    assert.equal(subtotal,10.01,'Coupon validation must receive paise-rounded amount');
    assert.equal(beginCount,1);
    assert.equal(rollbackCount,1);

    await assert.rejects(()=>topup('0.005'),error=>error===sentinel);
    assert.equal(subtotal,0.01,'Tiny positive amounts must be converted to a valid paise value');
    for(const bad of ['abc','-1.00','0',''])await assert.rejects(()=>topup(bad),error=>error.code==='INVALID_AMOUNT');

    const source=fs.readFileSync(path.join(__dirname,'../src/services/walletCouponService.js'),'utf8');
    assert(source.includes('const value=paiseToMoney(parseMoneyPaise(amount))'),
      'Manual coupon top-ups must use the same paise parser as gateway top-ups');
    assert(source.includes('parseMoneyPaise(locked.balance||0,{allowZero:true})+parseMoneyPaise(value)'),
      'Fully discounted coupon credit must add paise, not floating-point amounts');
    assert(source.includes('wallet_credited_amount:paiseToMoney('),
      'Reported wallet credit must be calculated with paise precision');

    console.log('Wallet coupon monetary precision regression tests passed.');
  }finally{Module._load=originalLoad;}
})().catch(error=>{console.error(error);process.exitCode=1;});
