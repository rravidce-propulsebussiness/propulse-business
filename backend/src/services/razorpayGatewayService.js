const crypto=require('crypto');
const {parseMoneyPaise}=require('../utils/money');

const API_BASE='https://api.razorpay.com/v1';
const MAX_RESPONSE_BYTES=128*1024;
const REQUEST_TIMEOUT_MS=10000;

function keyId(){return String(process.env.RAZORPAY_KEY_ID||'').trim()}
function keySecret(){return String(process.env.RAZORPAY_KEY_SECRET||'').trim()}
function webhookSecret(){return String(process.env.RAZORPAY_WEBHOOK_SECRET||'').trim()}
function isCheckoutConfigured(){return Boolean(keyId()&&keySecret())}
function isWebhookConfigured(){return Boolean(webhookSecret())}
function timingSafeHexEqual(expected,actual){
  const a=Buffer.from(String(expected||''),'hex'),b=Buffer.from(String(actual||''),'hex');
  return a.length>0&&a.length===b.length&&crypto.timingSafeEqual(a,b);
}
function hmacHex(secret,value){return crypto.createHmac('sha256',secret).update(value).digest('hex')}
function verifyWebhookSignature(rawBody,signature){
  if(!isWebhookConfigured())throw Object.assign(new Error('Razorpay webhook secret is not configured'),{code:'GATEWAY_WEBHOOK_NOT_CONFIGURED'});
  const body=Buffer.isBuffer(rawBody)?rawBody:Buffer.from(rawBody||'');
  const expected=hmacHex(webhookSecret(),body);
  return timingSafeHexEqual(expected,String(signature||'').trim());
}
function verifyCheckoutSignature({orderId,paymentId,signature}){
  if(!isCheckoutConfigured())throw Object.assign(new Error('Razorpay checkout is not configured'),{code:'GATEWAY_NOT_CONFIGURED'});
  const expected=hmacHex(keySecret(),String(orderId)+'|'+String(paymentId));
  return timingSafeHexEqual(expected,String(signature||'').trim());
}
async function readLimited(response,maxBytes=MAX_RESPONSE_BYTES){
  const declared=Number(response.headers.get('content-length')||0);
  if(declared>maxBytes)throw Object.assign(new Error('Payment provider returned an oversized response'),{code:'GATEWAY_RESPONSE_TOO_LARGE'});
  if(!response.body)return '';
  const reader=response.body.getReader(),chunks=[];let total=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)return Buffer.concat(chunks,total).toString('utf8');
      const chunk=Buffer.from(value);total+=chunk.length;
      if(total>maxBytes){await reader.cancel().catch(()=>{});throw Object.assign(new Error('Payment provider returned an oversized response'),{code:'GATEWAY_RESPONSE_TOO_LARGE'})}
      chunks.push(chunk);
    }
  }finally{reader.releaseLock()}
}
async function request(path,{method='GET',body}={}){
  if(!isCheckoutConfigured())throw Object.assign(new Error('Online payment gateway is not configured'),{code:'GATEWAY_NOT_CONFIGURED'});
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  timeout.unref?.();
  try{
    const auth=Buffer.from(keyId()+':'+keySecret()).toString('base64');
    const response=await fetch(API_BASE+path,{
      method,
      headers:{Authorization:'Basic '+auth,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
      body:body?JSON.stringify(body):undefined,
      signal:controller.signal
    });
    const text=await readLimited(response);
    let parsed={};
    try{parsed=text?JSON.parse(text):{}}catch{parsed={}}
    if(!response.ok){
      const err=new Error('Payment provider request failed');
      err.code='GATEWAY_PROVIDER_ERROR';err.providerStatus=response.status;
      throw err;
    }
    return parsed;
  }catch(error){
    if(error?.name==='AbortError')throw Object.assign(new Error('Payment provider request timed out'),{code:'GATEWAY_TIMEOUT'});
    throw error;
  }finally{clearTimeout(timeout)}
}
function amountMinor(value){
  const paise=parseMoneyPaise(value);
  if(paise>BigInt(Number.MAX_SAFE_INTEGER))throw Object.assign(new Error('Payment amount is outside the supported gateway range'),{code:'INVALID_AMOUNT'});
  return Number(paise);
}
async function createOrder({localPaymentId,amount,currency='INR',purchaseType}){
  const minor=amountMinor(amount);
  const order=await request('/orders',{method:'POST',body:{
    amount:minor,currency:String(currency||'INR').toUpperCase(),
    receipt:'pp_pay_'+String(localPaymentId),
    notes:{local_payment_id:String(localPaymentId),purchase_type:String(purchaseType||'purchase').slice(0,40)}
  }});
  if(!order?.id||String(order.id).length>180)throw Object.assign(new Error('Payment provider did not return a valid order'),{code:'GATEWAY_INVALID_RESPONSE'});
  if(Number(order.amount)!==minor||String(order.currency||'').toUpperCase()!==String(currency||'INR').toUpperCase())throw Object.assign(new Error('Payment provider order amount did not match the requested amount'),{code:'GATEWAY_AMOUNT_MISMATCH'});
  return order;
}
async function fetchPayment(providerPaymentId){
  const id=String(providerPaymentId||'').trim();
  if(!/^pay_[A-Za-z0-9]+$/.test(id))throw Object.assign(new Error('Invalid gateway payment ID'),{code:'GATEWAY_PAYMENT_INVALID'});
  return request('/payments/'+encodeURIComponent(id));
}
function publicConfig(){return{provider:'razorpay',enabled:isCheckoutConfigured(),keyId:isCheckoutConfigured()?keyId():null}}
module.exports={
  isCheckoutConfigured,isWebhookConfigured,verifyWebhookSignature,verifyCheckoutSignature,
  createOrder,fetchPayment,publicConfig,amountMinor,hmacHex,timingSafeHexEqual
};
