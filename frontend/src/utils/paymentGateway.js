import { authRequest } from './auth'

let scriptPromise=null
function loadRazorpay(){
  if(window.Razorpay)return Promise.resolve(window.Razorpay)
  if(scriptPromise)return scriptPromise
  scriptPromise=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-propulse-razorpay="1"]')
    if(existing){existing.addEventListener('load',()=>resolve(window.Razorpay),{once:true});existing.addEventListener('error',()=>reject(new Error('Unable to load online payment.')),{once:true});return}
    const script=document.createElement('script')
    script.src='https://checkout.razorpay.com/v1/checkout.js'
    script.async=true
    script.dataset.propulseRazorpay='1'
    script.onload=()=>window.Razorpay?resolve(window.Razorpay):reject(new Error('Online payment could not start.'))
    script.onerror=()=>reject(new Error('Unable to load online payment.'))
    document.head.appendChild(script)
  }).catch(error=>{scriptPromise=null;throw error})
  return scriptPromise
}

export async function loadPaymentOptions(){
  return authRequest('/payment-receiving-details/options')
}

export async function runRazorpayCheckout({paymentId,investmentDraftId,checkout:preparedCheckout,description='ProPulse payment'}){
  const checkout=preparedCheckout||await authRequest('/payments/gateway-order',{
    method:'POST',idempotency:true,
    body:JSON.stringify({...(paymentId?{paymentId}:{}),...(investmentDraftId?{investmentDraftId}:{})})
  })
  if(!checkout?.paymentId||!checkout?.orderId||!checkout?.keyId)throw new Error('Online payment is not available right now.')
  const Razorpay=await loadRazorpay()
  return new Promise((resolve,reject)=>{
    let settled=false
    const finish=(fn,value)=>{if(settled)return;settled=true;fn(value)}
    const instance=new Razorpay({
      key:checkout.keyId,amount:Number(checkout.amount),currency:checkout.currency||'INR',order_id:checkout.orderId,
      name:'ProPulse Business',description,
      handler:async response=>{
        try{
          const result=await authRequest(`/payments/${checkout.paymentId}/gateway-confirm`,{
            method:'POST',idempotency:true,
            body:JSON.stringify({providerOrderId:response.razorpay_order_id,providerPaymentId:response.razorpay_payment_id,signature:response.razorpay_signature})
          })
          finish(resolve,{checkout,result})
        }catch(error){finish(reject,error)}
      },
      modal:{ondismiss:()=>{const error=new Error('Payment window was closed.');error.code='PAYMENT_CANCELLED';finish(reject,error)}}
    })
    instance.on?.('payment.failed',response=>{const error=new Error(response?.error?.description||'Online payment failed. You can retry.');error.code='GATEWAY_PAYMENT_FAILED';finish(reject,error)})
    instance.open()
  })
}
