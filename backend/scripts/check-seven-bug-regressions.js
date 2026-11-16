// Regression checks for the seven payment, investor, pricing and security bugs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

async function testLeasedRateLimit() {
  const originalLoad = Module._load;
  const oldEnv = process.env.NODE_ENV;
  let reserved = 0;
  const calls = [];
  Module._load = function(request, parent, isMain) {
    if (request === '../config/database' && parent && parent.filename.endsWith('rateLimitMiddleware.js')) {
      return { query: async (_sql, params) => {
        await Promise.resolve();
        reserved += Number(params[2]);
        calls.push(Number(params[2]));
        return {rows:[{request_count:reserved, retry_after:60}]};
      }};
    }
    return originalLoad.apply(this, arguments);
  };
  try {
    process.env.NODE_ENV = 'production';
    const modulePath = require.resolve('../src/middleware/rateLimitMiddleware');
    delete require.cache[modulePath];
    const rateLimit = require(modulePath);
    const handler = rateLimit({windowMs:60000,max:8,sharedChunkSize:3});
    const req = {ip:'127.0.0.1',baseUrl:'/api/test',path:'/burst',route:{path:'/burst'}};
    const responses = await Promise.all(Array.from({length:12}, () => {
      let status = 200;
      let allowed = false;
      return handler(req, {
        setHeader:()=>{},
        status(code){status=code;return this;},
        json(){return this;}
      },()=>{allowed=true;}).then(()=>({status,allowed}));
    }));
    assert.equal(responses.filter(item=>item.allowed).length,8,'Only first eight burst requests may pass');
    assert.equal(responses.filter(item=>item.status===429).length,4,'Four excess burst requests must be limited');
    assert.deepEqual(calls,[3,3,3,3],'Each exhausted lease must fetch a new nonoverlapping chunk');
    delete require.cache[modulePath];
  } finally {
    Module._load = originalLoad;
    if (oldEnv===undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=oldEnv;
  }
}

async function testNoChargePayments() {
  const originalLoad = Module._load;
  let debits = 0, reserves = 0;
  Module._load = function(request, parent, isMain) {
    if (parent && parent.filename.endsWith('paymentService.js')) {
      if (request === './walletService') return {debitForPayment:async()=>{debits++;throw new Error('Zero checkouts may not debit wallets');}};
      if (request === './couponService') return {reserveRedemption:async()=>{reserves++;}};
    }
    return originalLoad.apply(this, arguments);
  };
  try {
    const modulePath = require.resolve('../src/services/paymentService');
    delete require.cache[modulePath];
    const service = require(modulePath);
    const client={query:async(sql,params)=>{
      if (sql.includes('pg_advisory_xact_lock')) return {rows:[]};
      if (sql.includes('FROM payments WHERE user_id=')) return {rows:[]};
      if (sql.startsWith('INSERT INTO payments')) return {rows:[{id:123,status:'pending',amount:params[2]}]};
      if (sql.startsWith('UPDATE payments SET payment_method')) return {rows:[{id:123,amount:0,status:params[1],payment_method:params[0],wallet_amount:params[2],external_amount:params[3]}]};
      throw new Error('Unexpected no-charge SQL: '+sql);
    }};
    for (const type of ['membership','lead']) {
      const r=await service.createWalletFirstPayment(client,{
        userId:7,totalAmount:0,purchaseType:type,purchaseId:14,
        coupon:{coupon:{id:9,code:'FREE'},discountAmount:100},subtotalAmount:100,
        useWallet:type==='membership'
      });
      assert.equal(r.payment.status,'paid');
      assert.equal(r.externalAmount,0);
      assert.equal(r.walletAmount,0);
      assert.equal(r.requiresExternalPayment,false);
    }
    assert.equal(debits,0);
    assert.equal(reserves,2);
    await assert.rejects(()=>service.createWalletFirstPayment(client,{userId:7,totalAmount:0,purchaseType:'investment',purchaseId:3}),e=>e.code==='INVALID_AMOUNT');
    delete require.cache[modulePath];
  } finally {
    Module._load=originalLoad;
  }
}

const paymentRoutes=read('src/routes/paymentRoutes.js');
const paymentController=read('src/controllers/paymentController.js');
const adminInvestor=read('../frontend/src/admin/pages/AdminInvestmentsWallet.jsx');
const leadPurchase=read('src/services/leadPurchaseService.js');
const pricing=read('src/controllers/leadPartnerController.js');
const limiter=read('src/middleware/rateLimitMiddleware.js');
const proxy=read('../hostinger-server.js');
const recovery=read('src/controllers/authController.js');
const recoveryUi=read('../frontend/src/pages/ForgotPassword.jsx');

assert.match(paymentRoutes,/\/:referenceId\/reference/);
assert.match(paymentRoutes,/draft_\[a-f0-9\]\{36\}/);
assert.match(paymentController,/req\.params\.referenceId/);
assert.match(adminInvestor,/transferAll: true/);
assert.doesNotMatch(adminInvestor,/forceTransfer: true/);
assert.match(leadPurchase,/useWallet\|\|Number\(amount\)===0/);
assert.match(pricing,/function pricingErrorStatus/);
for(const token of ['PRICING_SCOPE_EXISTS','PRICING_LOCKED','INVALID_LEAD_ID','NOT_FOUND']){
  assert.ok(pricing.includes(token),'Missing pricing error mapping '+token);
}
assert.match(limiter,/while \(true\)/);
assert.match(proxy,/req\.socket\.encrypted\?'https':'http'/);
assert.doesNotMatch(recovery,/ACCOUNT_NOT_FOUND/);
assert.match(recovery,/if \(!reset \|\| reset\.cooldown\) return acknowledge\(\)/);
assert.doesNotMatch(recoveryUi,/ACCOUNT_NOT_FOUND/);

(async()=>{
  await testLeasedRateLimit();
  await testNoChargePayments();
  console.log('Seven reported bug regression checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
