const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(v,m)=>{if(!v)throw new Error(m)};

const migration=read('src/database/migrations/20260928_payment_gateway_webhooks.sql');
const razorpay=read('src/services/razorpayGatewayService.js');
const gateway=read('src/services/paymentGatewayService.js');
const payment=read('src/services/paymentService.js');
const wallet=read('src/services/walletService.js');
const walletCoupon=read('src/services/walletCouponService.js');
const draft=read('src/services/investmentPaymentDraftService.js');
const paymentRoutes=read('src/routes/paymentRoutes.js');
const walletRoutes=read('src/routes/walletRoutes.js');
const webhookRoutes=read('src/routes/paymentWebhookRoutes.js');
const webhookController=read('src/controllers/paymentWebhookController.js');
const server=read('src/server.js');

assert(migration.includes('CREATE TABLE IF NOT EXISTS payment_provider_events'),'Provider webhook event ledger is missing');
assert(migration.includes('UNIQUE(provider,event_key)'),'Provider webhook events must deduplicate');
assert(migration.includes('uq_payments_gateway_order')&&migration.includes('uq_payments_gateway_payment'),'Gateway order/payment IDs must be unique');

assert(razorpay.includes("crypto.createHmac('sha256'")&&razorpay.includes('timingSafeEqual'),'Razorpay signatures must use HMAC SHA-256 and timing-safe comparison');
assert(razorpay.includes("String(orderId)+'|'+String(paymentId)"),'Checkout signature must use server order ID + payment ID');
assert(razorpay.includes('AbortController()')&&razorpay.includes('MAX_RESPONSE_BYTES'),'Provider API calls must have timeout and response-size bounds');
assert(!razorpay.includes('console.log')&&!gateway.includes('rawBody.toString') ,'Payment secrets/raw webhook bodies must not be logged');

const rawMount=server.indexOf("app.use('/api/payment-webhooks/razorpay',express.raw");
const jsonMount=server.indexOf("app.use(express.json({limit:DEFAULT_JSON_BYTES}))");
assert(rawMount>=0&&jsonMount>=0&&rawMount<jsonMount,'Webhook raw-body parser must run before the normal JSON parser');
assert(webhookController.includes("x-razorpay-signature")&&webhookRoutes.includes('webhookLimit'),'Webhook signature and rate limit are required');

assert(paymentRoutes.includes("idempotency('payment.gateway_order')")&&paymentRoutes.includes("idempotency('payment.gateway_confirm')"),'Gateway checkout/confirm writes must be idempotent');
assert(walletRoutes.includes("idempotency('wallet.gateway_topup')"),'Gateway wallet top-up creation must be idempotent');
assert(gateway.includes("['payment.captured','order.paid','payment.failed']"),'Expected Razorpay payment webhook events are not handled');
assert(gateway.includes("existing.status==='failed'||staleReceived")&&gateway.includes("Date.now()-5*60*1000"),'Failed or stale webhook claims must be reclaimable');
assert(gateway.includes("type==='payment.failed'")&&gateway.includes('failedAttempt:true'),'Failed provider attempts must be recorded without terminally cancelling the local checkout');
assert(gateway.includes('assertCapturedEntity(payment')&&gateway.includes('GATEWAY_AMOUNT_MISMATCH')&&gateway.includes('GATEWAY_CURRENCY_MISMATCH'),'Captured payments must match local amount, currency and order');
assert(gateway.includes("source:'gateway'")&&payment.includes("action:'payment.gateway_settle'"),'Gateway capture must use shared payment fulfillment and critical audit');

assert(payment.includes("action:'payment.review'"),'Manual Admin payment audit must remain');
assert(payment.includes("status==='paid' && Number(payment.external_amount)>0")&&payment.includes("code:'PAYMENT_PROOF_REQUIRED'"),'Manual proof approval guard must remain');
assert(payment.includes("code:'GATEWAY_PAYMENT_ACTIVE'")&&gateway.includes("MANUAL_PAYMENT_ALREADY_SUBMITTED"),'Manual and gateway settlement channels must be mutually exclusive');
assert(wallet.includes("code:'GATEWAY_MANAGED_TOPUP'"),'Admin must not manually settle gateway wallet top-ups');
assert(wallet.includes('completeGatewayTopup')&&walletCoupon.includes('createGatewayTopup'),'Gateway wallet top-up flow is incomplete');
assert(draft.includes('async function prepare')&&draft.includes('createInvestmentCheckout'),'Investment drafts must be convertible into gateway checkouts');

console.log('Payment gateway and webhook architecture regression test passed.');
