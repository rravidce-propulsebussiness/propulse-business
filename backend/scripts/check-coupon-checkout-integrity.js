const assert=require('assert');
const Module=require('module');
const path=require('path');

function makeHarness({activeUses=0}={}){
  const calls=[];let redemption={id:501,status:'reserved',coupon_id:9,user_id:12,payment_id:77,discount_amount:100};let redeemed=false;
  const coupon={id:9,code:'SAVE10',discount_type:'percent',discount_value:'10',max_discount:null,min_order_amount:'0',usage_limit:1,used_count:activeUses,purchase_types:['membership'],membership_plan_ids:[],is_active:true,starts_at:null,expires_at:null};
  const client={query:async(sql,params=[])=>{
    calls.push({sql,params});
    if(/^BEGIN|^COMMIT|^ROLLBACK/.test(sql)||sql.includes('pg_advisory_xact_lock'))return{rows:[]};
    if(sql.startsWith('SELECT * FROM coupons'))return{rows:[coupon]};
    if(sql.includes('SELECT 1 FROM coupon_users'))return{rowCount:0,rows:[]};
    if(sql.includes('COUNT(*)::int count FROM coupon_users'))return{rows:[{count:0}]};
    if(sql.includes('SELECT 1 FROM coupon_industries'))return{rowCount:0,rows:[]};
    if(sql.includes('COUNT(*)::int count FROM coupon_industries'))return{rows:[{count:0}]};
    if(sql.includes('COUNT(*)::int count FROM coupon_redemptions WHERE coupon_id=$1 AND status'))return{rows:[{count:activeUses}]};
    if(sql.includes('COUNT(*)::int count FROM coupon_redemptions WHERE coupon_id=$1 AND user_id=$2'))return{rows:[{count:0}]};
    if(sql.startsWith('SELECT id,status FROM coupon_redemptions WHERE payment_id=$1'))return{rows:[]};
    if(sql.startsWith('INSERT INTO coupon_redemptions'))return{rows:[redemption]};
    if(sql.startsWith('SELECT * FROM coupon_redemptions WHERE payment_id=$1 FOR UPDATE'))return{rows:[redemption]};
    if(sql.startsWith('UPDATE coupons SET used_count')){coupon.used_count+=1;return{rows:[]};}
    if(sql.startsWith("UPDATE coupon_redemptions SET status='redeemed'")){redemption={...redemption,status:'redeemed'};redeemed=true;return{rows:[redemption]};}
    if(sql.startsWith("UPDATE coupon_redemptions SET status='released'")){redemption={...redemption,status:'released'};return{rows:[redemption]};}
    if(sql.includes('FROM payments WHERE user_id=$1'))return{rows:[]};
    if(sql.startsWith('INSERT INTO payments'))return{rows:[{id:77,user_id:12,membership_plan_id:3,amount:900,payment_method:'manual',status:'pending',wallet_amount:0,external_amount:900,purchase_type:'membership',purchase_id:3,coupon_id:9,coupon_code:'SAVE10',subtotal_amount:1000,discount_amount:100}]};
    if(sql.includes('SELECT balance FROM wallets WHERE user_id=$1 FOR UPDATE'))return{rows:[{balance:900}]};
    if(sql.startsWith('UPDATE payments SET wallet_amount=$1,external_amount=0,wallet_transaction_id=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *'))return{rows:[{id:77,user_id:12,membership_plan_id:3,amount:900,payment_method:'wallet',status:'pending',wallet_amount:900,external_amount:0,wallet_transaction_id:123,coupon_id:9,coupon_code:'SAVE10',subtotal_amount:1000,discount_amount:100}]};
    if(sql.startsWith('UPDATE payments SET payment_method'))return{rows:[{id:77,user_id:12,membership_plan_id:3,amount:900,payment_method:'wallet',status:'paid',wallet_amount:900,external_amount:0,coupon_id:9,coupon_code:'SAVE10',subtotal_amount:1000,discount_amount:100}]};
    if(sql.includes('FROM membership_plans WHERE id=$1'))return{rows:[{id:3,name:'Pro',plan_type:'pro',duration_days:30,price:'1000',is_active:true}]};
    if(sql.startsWith("SELECT * FROM memberships WHERE user_id=$1 AND membership_plan_id=$2 AND status='active' AND expires_at>CURRENT_TIMESTAMP ORDER BY expires_at DESC LIMIT 1 FOR UPDATE"))return{rows:[]};
    if(sql.includes("FROM memberships m JOIN membership_plans mp")&&sql.includes('LIMIT 1 FOR UPDATE OF m'))return{rows:[]};
    if(sql.startsWith('INSERT INTO memberships'))return{rows:[{id:801}]};
    if(sql.startsWith('INSERT INTO membership_admin_history'))return{rows:[]};
    throw new Error(`Unhandled SQL in harness: ${sql}`);
  }};
  client.release=()=>{};
  const fakePool={query:client.query,connect:async()=>client};
  const fakeWallet={debitForPayment:async()=>({externalAmount:0,walletAmount:900,balanceAfter:0,walletTransactionId:123})};
  const fakeMembership={isProMember:async()=>true};
  const original=Module._load;
  Module._load=function(request,parent,isMain){
    if(request==='../config/database'&&parent.filename.endsWith('/services/couponService.js'))return fakePool;
    if(request==='../config/database'&&parent.filename.endsWith('/services/paymentService.js'))return fakePool;
    if(request==='./couponService'&&parent.filename.endsWith('/services/paymentService.js'))return require(path.join(__dirname,'../src/services/couponService'));
    if(request==='./walletService'&&parent.filename.endsWith('/services/paymentService.js'))return fakeWallet;
    if(request==='./membershipAccessService'&&parent.filename.endsWith('/services/paymentService.js'))return fakeMembership;
    return original.apply(this,arguments);
  };
  delete require.cache[require.resolve('../src/services/couponService')];delete require.cache[require.resolve('../src/services/paymentService')];
  const paymentService=require('../src/services/paymentService');
  return{paymentService,calls,redemption:()=>redemption,wasRedeemed:()=>redeemed,restore:()=>{Module._load=original;}};
}

(async()=>{
  const h=makeHarness();try{
    const result=await h.paymentService.createMembershipCheckout({userId:12,membershipPlanId:3,couponCode:'SAVE10'});
    assert.strictEqual(result.payment.amount,900,'Coupon discount must reduce payment amount');
    assert.deepStrictEqual(result.coupon,{code:'SAVE10',discountAmount:100,subtotalAmount:1000,finalAmount:900});
    assert.strictEqual(h.redemption().status,'redeemed','Wallet-paid coupon must be redeemed atomically');
    assert.strictEqual(h.wasRedeemed(),true,'Coupon redemption must be finalized');
    assert.ok(h.calls.some(x=>x.sql.startsWith('INSERT INTO coupon_redemptions')),'Checkout must create a coupon redemption ledger row');
  }finally{h.restore();}
  const limited=makeHarness({activeUses:1});try{await assert.rejects(()=>limited.paymentService.createMembershipCheckout({userId:12,membershipPlanId:3,couponCode:'SAVE10'}),e=>e.code==='USAGE_LIMIT');}finally{limited.restore();}
  console.log('Coupon checkout integrity regression test passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
