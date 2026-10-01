const paymentGatewayService=require('../services/paymentGatewayService');

async function razorpay(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    if(!Buffer.isBuffer(req.body))return res.status(400).json({error:'Webhook body must be raw JSON',code:'GATEWAY_WEBHOOK_INVALID'});
    const signature=String(req.get('x-razorpay-signature')||'').trim();
    if(!signature)return res.status(400).json({error:'Webhook signature is required',code:'GATEWAY_SIGNATURE_REQUIRED'});
    const eventId=String(req.get('x-razorpay-event-id')||'').trim()||null;
    const result=await paymentGatewayService.handleRazorpayWebhook({rawBody:req.body,signature,eventId});
    return res.status(200).json({ok:true,...result});
  }catch(error){
    const map={GATEWAY_SIGNATURE_INVALID:400,GATEWAY_WEBHOOK_NOT_CONFIGURED:503,GATEWAY_WEBHOOK_INVALID:400,GATEWAY_AMOUNT_MISMATCH:409,GATEWAY_CURRENCY_MISMATCH:409,GATEWAY_ORDER_MISMATCH:409,GATEWAY_PAYMENT_MISMATCH:409,GATEWAY_PROVIDER_ERROR:502,GATEWAY_TIMEOUT:504,GATEWAY_PAYMENT_INVALID:400};
    const status=map[error.code]||500;
    if(status>=500)console.error('Razorpay webhook failed:',error?.stack||error);
    return res.status(status).json({error:status>=500?'Unable to process payment webhook':error.message,code:error.code||'WEBHOOK_PROCESSING_FAILED'});
  }
}
module.exports={razorpay};
