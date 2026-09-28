const pool=require('../src/config/database');
const gateway=require('../src/services/paymentGatewayService');
const razorpay=require('../src/services/razorpayGatewayService');
const assert=(v,m)=>{if(!v)throw new Error(m)};

process.env.RAZORPAY_KEY_ID='rzp_test_ci';
process.env.RAZORPAY_KEY_SECRET='ci_key_secret';
process.env.RAZORPAY_WEBHOOK_SECRET='ci_webhook_secret';

let orderCounter=0;
global.fetch=async(url,options={})=>{
  const target=String(url);
  if(target.endsWith('/orders')&&String(options.method)==='POST'){
    const body=JSON.parse(String(options.body||'{}'));
    orderCounter+=1;
    return new Response(JSON.stringify({id:'order_ci_'+orderCounter,entity:'order',amount:body.amount,currency:body.currency,status:'created'}),{status:200,headers:{'content-type':'application/json'}});
  }
  const match=target.match(/\/payments\/(pay_[A-Za-z0-9]+)/);
  if(match){
    const id=match[1];
    const row=(await pool.query("SELECT gateway_order_id,external_amount,currency FROM payments WHERE status='pending' AND gateway='razorpay' ORDER BY id LIMIT 1")).rows[0];
    return new Response(JSON.stringify({id,entity:'payment',order_id:row.gateway_order_id,amount:razorpay.amountMinor(row.external_amount),currency:row.currency||'INR',status:'captured'}),{status:200,headers:{'content-type':'application/json'}});
  }
  return new Response(JSON.stringify({error:'not found'}),{status:404,headers:{'content-type':'application/json'}});
};

(async()=>{
  const suffix=Date.now();
  const originalAvailability=(await pool.query('SELECT * FROM payment_availability_settings WHERE id=1')).rows[0];
  await pool.query("UPDATE payment_availability_settings SET online_enabled=TRUE,online_display_mode='live',updated_at=CURRENT_TIMESTAMP WHERE id=1");
  const user=(await pool.query("INSERT INTO users(name,email,password_hash,role,is_active) VALUES($1,$2,'x','business',TRUE) RETURNING id",['Gateway CI','gateway-ci-'+suffix+'@example.test'])).rows[0];

  async function payment(amount){
    return (await pool.query(
      `INSERT INTO payments(user_id,amount,currency,payment_method,status,wallet_amount,external_amount,notes)
       VALUES($1,$2,'INR','manual','pending',0,$2,'gateway ci') RETURNING *`,
      [user.id,amount]
    )).rows[0];
  }

  const p1=await payment(100);
  const checkout=await gateway.createOrderForPayment({userId:user.id,paymentId:p1.id});
  assert(checkout.orderId==='order_ci_1'&&checkout.amount===10000,'Gateway order must use exact paise amount');
  const saved1=(await pool.query('SELECT payment_method,gateway,gateway_order_id FROM payments WHERE id=$1',[p1.id])).rows[0];
  assert(saved1.payment_method==='gateway'&&saved1.gateway==='razorpay'&&saved1.gateway_order_id===checkout.orderId,'Local payment must link to provider order');

  const providerPaymentId='pay_CIConfirm123';
  const signature=razorpay.hmacHex(process.env.RAZORPAY_KEY_SECRET,checkout.orderId+'|'+providerPaymentId);
  const confirmed=await gateway.confirmCheckout({userId:user.id,paymentId:p1.id,providerOrderId:checkout.orderId,providerPaymentId,signature});
  assert(confirmed.status==='paid','Verified captured checkout must settle local payment');
  const confirmedAgain=await gateway.confirmCheckout({userId:user.id,paymentId:p1.id,providerOrderId:checkout.orderId,providerPaymentId,signature});
  assert(confirmedAgain.alreadyFinalized===true,'Repeated browser confirmation must be idempotent');

  const p2=await payment(50);
  const checkout2=await gateway.createOrderForPayment({userId:user.id,paymentId:p2.id});
  const capturedPayload=Buffer.from(JSON.stringify({entity:'event',event:'payment.captured',payload:{payment:{entity:{id:'pay_webhook_ci',entity:'payment',order_id:checkout2.orderId,amount:5000,currency:'INR',status:'captured'}}}}));
  const webhookSig=razorpay.hmacHex(process.env.RAZORPAY_WEBHOOK_SECRET,capturedPayload);
  const first=await gateway.handleRazorpayWebhook({rawBody:capturedPayload,signature:webhookSig,eventId:'evt-ci-'+suffix});
  const replay=await gateway.handleRazorpayWebhook({rawBody:capturedPayload,signature:webhookSig,eventId:'evt-ci-'+suffix});
  assert(first.paid===true&&replay.duplicate===true,'Captured webhook must settle once and replay safely');
  const eventCount=Number((await pool.query('SELECT COUNT(*)::int count FROM payment_provider_events WHERE provider=$1 AND event_key=$2',['razorpay','evt-ci-'+suffix])).rows[0].count);
  assert(eventCount===1,'Webhook event ledger must deduplicate provider retries');

  const p3=await payment(75);
  const checkout3=await gateway.createOrderForPayment({userId:user.id,paymentId:p3.id});
  const failedPayload=Buffer.from(JSON.stringify({entity:'event',event:'payment.failed',payload:{payment:{entity:{id:'pay_failed_ci',entity:'payment',order_id:checkout3.orderId,amount:7500,currency:'INR',status:'failed'}}}}));
  const failedSig=razorpay.hmacHex(process.env.RAZORPAY_WEBHOOK_SECRET,failedPayload);
  const failed=await gateway.handleRazorpayWebhook({rawBody:failedPayload,signature:failedSig,eventId:'evt-failed-'+suffix});
  const stillPending=(await pool.query('SELECT status FROM payments WHERE id=$1',[p3.id])).rows[0].status;
  assert(failed.failedAttempt===true&&stillPending==='pending','Failed online attempt must leave local checkout retryable');

  const p4=await payment(80);
  const checkout4=await gateway.createOrderForPayment({userId:user.id,paymentId:p4.id});
  const mismatchPayload=Buffer.from(JSON.stringify({entity:'event',event:'payment.captured',payload:{payment:{entity:{id:'pay_mismatch_ci',entity:'payment',order_id:checkout4.orderId,amount:1,currency:'INR',status:'captured'}}}}));
  const mismatchSig=razorpay.hmacHex(process.env.RAZORPAY_WEBHOOK_SECRET,mismatchPayload);
  let mismatch=false;
  try{await gateway.handleRazorpayWebhook({rawBody:mismatchPayload,signature:mismatchSig,eventId:'evt-mismatch-'+suffix})}catch(error){mismatch=error.code==='GATEWAY_AMOUNT_MISMATCH'}
  assert(mismatch,'Signed webhook with wrong amount must be rejected');
  const mismatchState=(await pool.query('SELECT status FROM payments WHERE id=$1',[p4.id])).rows[0].status;
  assert(mismatchState==='pending','Amount mismatch must not fulfill local payment');

  await pool.query("DELETE FROM payment_provider_events WHERE local_payment_id IN (SELECT id FROM payments WHERE user_id=$1)",[user.id]);
  await pool.query("DELETE FROM critical_action_audit WHERE entity_type='payment' AND entity_id IN (SELECT id::text FROM payments WHERE user_id=$1)",[user.id]);
  await pool.query('DELETE FROM payments WHERE user_id=$1',[user.id]);
  await pool.query('DELETE FROM users WHERE id=$1',[user.id]);
  await pool.query('UPDATE payment_availability_settings SET offline_enabled=$1,online_enabled=$2,online_display_mode=$3,online_label=$4,online_coming_soon_message=$5,offline_label=$6,updated_by=$7,updated_at=$8 WHERE id=1',[
    originalAvailability.offline_enabled,originalAvailability.online_enabled,originalAvailability.online_display_mode,originalAvailability.online_label,originalAvailability.online_coming_soon_message,originalAvailability.offline_label,originalAvailability.updated_by,originalAvailability.updated_at
  ]);
  console.log('Payment gateway PostgreSQL runtime smoke passed.');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1}).finally(()=>pool.end());
