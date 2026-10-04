const crypto=require('crypto');
const pool=require('../config/database');
const razorpay=require('./razorpayGatewayService');
const notificationService=require('./notificationService');
const paymentAvailability=require('./paymentAvailabilityService');

function gatewayError(message,code){return Object.assign(new Error(message),{code})}
function expectedMinor(payment){return razorpay.amountMinor(payment.external_amount)}
function assertCapturedEntity(payment,entity){
  if(!entity)throw gatewayError('Payment provider response did not include payment details','GATEWAY_INVALID_RESPONSE');
  if(String(entity.order_id||'')!==String(payment.gateway_order_id||''))throw gatewayError('Payment provider order does not match this checkout','GATEWAY_ORDER_MISMATCH');
  if(Number(entity.amount)!==expectedMinor(payment))throw gatewayError('Payment provider amount does not match this checkout','GATEWAY_AMOUNT_MISMATCH');
  if(String(entity.currency||'').toUpperCase()!==String(payment.currency||'INR').toUpperCase())throw gatewayError('Payment provider currency does not match this checkout','GATEWAY_CURRENCY_MISMATCH');
}
async function gateways(){const availability=await paymentAvailability.get();return{availability,providers:[{...razorpay.publicConfig(),enabled:availability.onlineEnabled&&availability.onlineDisplayMode==='live'&&razorpay.isCheckoutConfigured()}]}}
async function getOwnedPayment(client,{userId,paymentId}){
  const row=(await client.query('SELECT * FROM payments WHERE id=$1 AND user_id=$2 FOR UPDATE',[Number(paymentId),Number(userId)])).rows[0];
  if(!row)throw gatewayError('Payment not found','NOT_FOUND');
  return row;
}
async function createOrderForPayment({userId,paymentId}){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const payment=await getOwnedPayment(client,{userId,paymentId});
    await paymentAvailability.requireOnline(client);
    if(payment.status!=='pending')throw gatewayError('This payment is not awaiting payment','PAYMENT_NOT_PENDING');
    if(Number(payment.external_amount||0)<=0)throw gatewayError('This payment does not require an external payment','GATEWAY_NOT_REQUIRED');
    if(String(payment.manual_reference||'').trim()||String(payment.proof_url||'').trim())throw gatewayError('A manual payment proof has already been submitted for this payment','MANUAL_PAYMENT_ALREADY_SUBMITTED');
    if(payment.gateway&&payment.gateway!=='razorpay')throw gatewayError('This payment is already linked to another gateway','GATEWAY_CONFLICT');
    if(payment.gateway_order_id){
      await client.query('COMMIT');
      return{
        provider:'razorpay',paymentId:Number(payment.id),orderId:payment.gateway_order_id,
        amount:expectedMinor(payment),currency:payment.currency||'INR',keyId:razorpay.publicConfig().keyId,reused:true
      };
    }
    if(!razorpay.isCheckoutConfigured())throw gatewayError('Online payments are temporarily unavailable','GATEWAY_NOT_CONFIGURED');
    const order=await razorpay.createOrder({
      localPaymentId:payment.id,amount:payment.external_amount,currency:payment.currency||'INR',purchaseType:payment.purchase_type
    });
    const updated=(await client.query(
      `UPDATE payments SET payment_method='gateway',gateway='razorpay',gateway_order_id=$1,updated_at=CURRENT_TIMESTAMP
        WHERE id=$2 AND status='pending' AND gateway_order_id IS NULL
        RETURNING *`,
      [String(order.id),payment.id]
    )).rows[0];
    if(!updated)throw gatewayError('Payment checkout changed while the gateway order was being created','GATEWAY_CONFLICT');
    await client.query('COMMIT');
    return{
      provider:'razorpay',paymentId:Number(updated.id),orderId:updated.gateway_order_id,
      amount:Number(order.amount),currency:String(order.currency||updated.currency||'INR'),
      keyId:razorpay.publicConfig().keyId,reused:false
    };
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
async function createCheckout({userId,paymentId,investmentDraftId}){
  let resolvedPaymentId=paymentId;
  if(!resolvedPaymentId&&investmentDraftId){
    const prepared=await require('./investmentPaymentDraftService').prepare({id:investmentDraftId,userId});
    resolvedPaymentId=prepared.payment.id;
  }
  if(!resolvedPaymentId)throw gatewayError('Payment ID or investment payment session is required','PAYMENT_REFERENCE_REQUIRED');
  return createOrderForPayment({userId,paymentId:resolvedPaymentId});
}
async function confirmCheckout({userId,paymentId,providerOrderId,providerPaymentId,signature}){
  const payment=(await pool.query('SELECT * FROM payments WHERE id=$1 AND user_id=$2',[Number(paymentId),Number(userId)])).rows[0];
  if(!payment)throw gatewayError('Payment not found','NOT_FOUND');
  if(payment.gateway!=='razorpay'||!payment.gateway_order_id)throw gatewayError('This payment does not have an active online checkout','GATEWAY_ORDER_NOT_FOUND');
  if(providerOrderId&&String(providerOrderId)!==String(payment.gateway_order_id))throw gatewayError('Checkout order does not match this payment','GATEWAY_ORDER_MISMATCH');
  if(!razorpay.verifyCheckoutSignature({orderId:payment.gateway_order_id,paymentId:providerPaymentId,signature}))throw gatewayError('Payment signature verification failed','GATEWAY_SIGNATURE_INVALID');
  if(payment.status==='paid')return{payment,alreadyFinalized:true};
  const providerPayment=await razorpay.fetchPayment(providerPaymentId);
  assertCapturedEntity(payment,providerPayment);
  if(String(providerPayment.status||'').toLowerCase()!=='captured')return{payment,providerStatus:providerPayment.status||'unknown',processing:true};
  return require('./paymentService').finalizePaymentStatus({
    id:payment.id,status:'paid',actorId:null,notes:'Razorpay payment captured and verified',
    source:'gateway',gatewayPaymentId:String(providerPayment.id)
  });
}
function payloadHash(rawBody){return crypto.createHash('sha256').update(rawBody).digest('hex')}
async function claimProviderEvent({provider,eventKey,eventType,rawBody,providerOrderId=null,providerPaymentId=null}){
  const hash=payloadHash(rawBody);
  const key=String(eventKey||hash).slice(0,180);
  const inserted=(await pool.query(
    `INSERT INTO payment_provider_events(provider,event_key,event_type,payload_hash,provider_order_id,provider_payment_id,status)
     VALUES($1,$2,$3,$4,$5,$6,'received')
     ON CONFLICT(provider,event_key) DO NOTHING
     RETURNING *`,
    [provider,key,String(eventType||'unknown').slice(0,100),hash,providerOrderId||null,providerPaymentId||null]
  )).rows[0];
  if(inserted)return{event:inserted,duplicate:false};
  let existing=(await pool.query('SELECT * FROM payment_provider_events WHERE provider=$1 AND event_key=$2',[provider,key])).rows[0];
  const staleReceived=existing?.status==='received'&&new Date(existing.updated_at).getTime()<=Date.now()-5*60*1000;
  if(existing&&(existing.status==='failed'||staleReceived)){
    existing=(await pool.query(
      `UPDATE payment_provider_events SET status='received',error_code=NULL,error_message=NULL,processed_at=NULL,updated_at=CURRENT_TIMESTAMP
        WHERE id=$1 RETURNING *`,
      [existing.id]
    )).rows[0];
    return{event:existing,duplicate:false,retry:true};
  }
  return{event:existing,duplicate:true};
}
async function finishProviderEvent(eventId,{status='processed',localPaymentId=null,errorCode=null,errorMessage=null}={}){
  return (await pool.query(
    `UPDATE payment_provider_events
        SET status=$1,local_payment_id=COALESCE($2,local_payment_id),error_code=$3,error_message=$4,
            processed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
      WHERE id=$5 RETURNING *`,
    [status,localPaymentId,errorCode?String(errorCode).slice(0,80):null,errorMessage?String(errorMessage).slice(0,1000):null,eventId]
  )).rows[0];
}
async function notifyGatewayMismatch(payment,message,metadata={}){
  await notificationService.notifyAdmins({
    type:'payment_gateway_mismatch',category:'security',severity:'critical',
    title:'Payment gateway verification mismatch',message,
    actionUrl:'/admin/risk-center',relatedType:'payment',relatedId:payment?.id||null,
    dedupeKey:`payment-gateway-mismatch:${payment?.id||'unknown'}:${metadata.providerPaymentId||metadata.orderId||'event'}`,
    metadata:{paymentId:payment?.id||null,...metadata}
  }).catch(error=>console.error('Gateway mismatch notification failed:',error.message));
}
async function handleRazorpayWebhook({rawBody,signature,eventId}){
  const body=Buffer.isBuffer(rawBody)?rawBody:Buffer.from(rawBody||'');
  if(!razorpay.verifyWebhookSignature(body,signature))throw gatewayError('Invalid payment webhook signature','GATEWAY_SIGNATURE_INVALID');
  let payload;
  try{payload=JSON.parse(body.toString('utf8'))}catch{throw gatewayError('Invalid payment webhook payload','GATEWAY_WEBHOOK_INVALID')}
  const type=String(payload?.event||'unknown');
  const entity=payload?.payload?.payment?.entity||null;
  const orderEntity=payload?.payload?.order?.entity||null;
  const orderId=String(entity?.order_id||orderEntity?.id||'').trim()||null;
  const providerPaymentId=String(entity?.id||'').trim()||null;
  const claim=await claimProviderEvent({provider:'razorpay',eventKey:eventId,eventType:type,rawBody:body,providerOrderId:orderId,providerPaymentId});
  if(claim.duplicate)return{accepted:true,duplicate:true,status:claim.event?.status||'processed'};
  const event=claim.event;
  try{
    if(!['payment.captured','order.paid','payment.failed'].includes(type)){
      await finishProviderEvent(event.id,{status:'ignored'});
      return{accepted:true,ignored:true};
    }
    if(!orderId){
      await finishProviderEvent(event.id,{status:'failed',errorCode:'GATEWAY_ORDER_MISSING',errorMessage:'Webhook did not contain an order ID'});
      return{accepted:true,ignored:true};
    }
    const payment=(await pool.query(`SELECT * FROM payments WHERE gateway='razorpay' AND gateway_order_id=$1`,[orderId])).rows[0];
    if(!payment){
      await finishProviderEvent(event.id,{status:'ignored',errorCode:'LOCAL_PAYMENT_NOT_FOUND',errorMessage:'No local payment matched the provider order'});
      return{accepted:true,ignored:true};
    }
    if(type==='order.paid'&&!entity){
      await finishProviderEvent(event.id,{status:'ignored',localPaymentId:payment.id,errorCode:'PAYMENT_ENTITY_MISSING',errorMessage:'Order paid webhook did not contain a payment entity; payment.captured will settle the checkout'});
      return{accepted:true,ignored:true,paymentId:Number(payment.id)};
    }
    if(type==='payment.failed'){
      await notificationService.notifyUser({
        userId:payment.user_id,type:'gateway_payment_attempt_failed',category:'payment',severity:'warning',
        title:'Online payment attempt failed',message:'Your online payment attempt did not complete. You can retry the same checkout or use direct payment.',
        actionUrl:payment.purchase_type==='membership'?'/membership':payment.purchase_type==='lead'?'/leads':payment.purchase_type==='investment'?'/investment':'/wallet',
        relatedType:'payment',relatedId:payment.id,
        dedupeKey:`gateway-payment-failed:${providerPaymentId||event.id}`,
        metadata:{provider:'razorpay',paymentId:Number(payment.id)}
      });
      await finishProviderEvent(event.id,{status:'processed',localPaymentId:payment.id});
      return{accepted:true,failedAttempt:true,paymentId:Number(payment.id)};
    }
    const captured=entity||await razorpay.fetchPayment(providerPaymentId);
    assertCapturedEntity(payment,captured);
    if(String(captured.status||'').toLowerCase()!=='captured'){
      await finishProviderEvent(event.id,{status:'ignored',localPaymentId:payment.id,errorCode:'PAYMENT_NOT_CAPTURED',errorMessage:'Provider payment is not captured'});
      return{accepted:true,processing:true,paymentId:Number(payment.id)};
    }
    const result=await require('./paymentService').finalizePaymentStatus({
      id:payment.id,status:'paid',actorId:null,notes:'Razorpay webhook confirmed captured payment',
      source:'gateway',gatewayPaymentId:String(captured.id)
    });
    await finishProviderEvent(event.id,{status:'processed',localPaymentId:payment.id});
    return{accepted:true,paymentId:Number(payment.id),paid:true,alreadyFinalized:Boolean(result?.alreadyFinalized)};
  }catch(error){
    const localPayment=orderId?(await pool.query(`SELECT * FROM payments WHERE gateway='razorpay' AND gateway_order_id=$1`,[orderId])).rows[0]:null;
    if(['GATEWAY_AMOUNT_MISMATCH','GATEWAY_CURRENCY_MISMATCH','GATEWAY_ORDER_MISMATCH'].includes(error.code)){
      await notifyGatewayMismatch(localPayment,'A signed Razorpay webhook did not match the local payment amount, currency, or order.',{providerPaymentId,orderId,code:error.code});
    }
    await finishProviderEvent(event.id,{status:'failed',localPaymentId:localPayment?.id||null,errorCode:error.code||'WEBHOOK_PROCESSING_FAILED',errorMessage:error.message}).catch(()=>{});
    throw error;
  }
}
module.exports={
  gateways,createCheckout,createOrderForPayment,confirmCheckout,handleRazorpayWebhook,
  claimProviderEvent,finishProviderEvent,assertCapturedEntity,payloadHash
};
