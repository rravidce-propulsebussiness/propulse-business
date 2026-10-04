const assert=require('assert');
const Module=require('module');
const path=require('path');

function makeHarness({activeUses=0}={}){
  const calls=[];let redemption={id:501,status:'reserved',coupon_id:9,user_id:12,payment_id:77,discount_amount:100};let redeemed=false;
  const coupon={id:9,code:'SAVE10',discount_type:'percent',discount_value:'10',max_discount:null,min_order_amount:'0',usage_limit:1,used_count:activeUses,purchase_types:['membership'],membership_plan_ids:[],is_active:true,starts_at:null,expires_at:null};
  const client={query:async(sql,params=[])=>{
    calls.push({sql,params});
    const q=String(sql).replace(/\s+/g,' ').trim();
    if(/^BEGIN|^COMMIT|^ROLLBACK/.test(sql)||q.includes('pg_advisory_xact_lock'))return{rows:[]};
    if(q.startsWith('SELECT * FROM coupons'))return{rows:[coupon]};
    if(q.includes('SELECT 1 FROM coupon_users'))return{rowCount:0,rows:[]};
    if(q.includes('COUNT(*)::int count FROM coupon_users'))return{rows:[{count:0}]};
    if(q.includes('SELECT 1 FROM coupon_industries'))return{rowCount:0,rows:[]};
    if(q.includes('COUNT(*)::int count FROM coupon_industries'))return{rows:[{count:0}]};
    if(q.includes('COUNT(*)::int count FROM coupon_redemptions WHERE coupon_id=$1 AND status'))return{rows:[{count:activeUses}]};
    if(q.includes('COUNT(*)::int count FROM coupon_redemptions WHERE coupon_id=$1 AND user_id=$2'))return{rows:[{count:0}]};
    if(q.startsWith('SELECT id,status FROM coupon_redemptions WHERE payment_id=$1'))return{rows:[]};
    if(q.startsWith('INSERT INTO coupon_redemptions'))return{rows:[redemption]};
    if(q.startsWith('SELECT * FROM coupon_redemptions WHERE payment_id=$1 FOR UPDATE'))return{rows:[redemption]};
    if(q.startsWith('UPDATE coupons SET used_count')){coupon.used_count+=1;return{rows:[]};}
    if(q.startsWith("UPDATE coupon_redemptions SET status='redeemed'")){redemption={...redemption,status:'redeemed'};redeemed=true;return{rows:[redemption]};}
    if(q.startsWith("UPDATE coupon_redemptions SET status='released'")){redemption={...redemption,status:'released'};return{rows:[redemption]};}
    if(q.includes("JOIN coupons c ON c.id=p.coupon_id")&&q.includes("c.benefit_type IN ('wallet_bonus','lead_bonus')"))return{rows:[]};
    if(q.includes('FROM payments WHERE user_id=$1'))return{rows:[]};
    if(q.startsWith('INSERT INTO payments'))return{rows:[{id:77,user_id:12,membership_plan_id:3,amount:900,payment_method:'manual',status:'pending',wallet_amount:0,external_amount:900,purchase_type:'membership',purchase_id:3,coupon_id:9,coupon_code:'SAVE10',subtotal_amount:1000,discount_amount:100}]};
    if(q.startsWith('UPDATE payments SET payment_method'))return{rows:[{id:77,user_id:12,membership_plan_id:3,amount:900,payment_method:'wallet',status:'paid',wallet_amount:900,external_amount:0,coupon_id:9,coupon_code:'SAVE10',subtotal_amount:1000,discount_amount:100}]};
    if(q.includes('FROM membership_plans WHERE id=$1'))return{rows:[{id:3,name:'Pro',plan_group:'grow',plan_type:'pro',duration_days:30,price:'1000',is_active:true}]};
    if(q.includes('FROM memberships m JOIN membership_plans p ON'))return{rows:[]};
    if(q.includes("FROM memberships m JOIN membership_plans mp")&&q.includes('LIMIT 1 FOR UPDATE OF m'))return{rows:[]};
    if(q.startsWith('INSERT INTO memberships'))return{rows:[{id:801}]};
    if(q.startsWith('INSERT INTO membership_admin_history'))return{rows:[]};
    throw new Error(`Unhandled SQL in harness: ${sql}`);
  }};
  client.release=()=>{};
  const fakePool={query:client.query,connect:async()=>client};
  const fakeWallet={debitForPayment:async()=>({externalAmount:0,walletAmount:900,balanceAfter:0,walletTransactionId:123})};
  const fakeMembership={isProMember:async()=>true};
  const fakeMembershipPlanService={resolvePlanForUser:async(userId,planId)=>({
    id:Number(planId),name:'Grow Monthly',plan_group:'grow',plan_type:'pro',
    duration_days:30,price:1000,is_active:true,lead_entitlements:[],
    pricing_rule_id:null,targeted_pricing:false
  })};
  const original=Module._load;
  Module._load=function(request,parent,isMain){
    if(request==='../config/database'&&parent.filename.replace(/\\/g,'/').endsWith('/services/couponService.js'))return fakePool;
    if(request==='../config/database'&&parent.filename.replace(/\\/g,'/').endsWith('/services/paymentService.js'))return fakePool;
    if(request==='./couponService'&&parent.filename.replace(/\\/g,'/').endsWith('/services/paymentService.js'))return require(path.join(__dirname,'../src/services/couponService'));
    if(request==='./walletService'&&parent.filename.replace(/\\/g,'/').endsWith('/services/paymentService.js'))return fakeWallet;
    if(request==='./membershipAccessService'&&parent.filename.replace(/\\/g,'/').endsWith('/services/paymentService.js'))return fakeMembership;
    if(request==='./membershipPlanService'&&parent.filename.replace(/\\/g,'/').endsWith('/services/paymentService.js'))return fakeMembershipPlanService;
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
    assert.ok(h.calls.some(x=>String(x.sql).replace(/\s+/g,' ').trim().startsWith('INSERT INTO coupon_redemptions')),'Checkout must create a coupon redemption ledger row');
  }finally{h.restore();}
  const limited=makeHarness({activeUses:1});try{await assert.rejects(()=>limited.paymentService.createMembershipCheckout({userId:12,membershipPlanId:3,couponCode:'SAVE10'}),e=>e.code==='USAGE_LIMIT');}finally{limited.restore();}
  console.log('Coupon checkout integrity regression test passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
