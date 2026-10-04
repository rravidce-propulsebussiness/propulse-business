const fs=require('fs');
const path=require('path');
const file=fs.readFileSync(path.join(__dirname,'../src/services/paymentService.js'),'utf8');
const required=[
  "status==='paid' && Number(payment.external_amount)>0",
  "String(payment.manual_reference||'').trim()",
  "String(payment.proof_url||'').trim()",
  "code:'PAYMENT_PROOF_REQUIRED'"
];
for(const marker of required){if(!file.includes(marker))throw new Error(`Manual payment approval guard missing: ${marker}`)}
const controller=fs.readFileSync(path.join(__dirname,'../src/controllers/paymentController.js'),'utf8');
if(!controller.includes("'PAYMENT_PROOF_REQUIRED'"))throw new Error('PAYMENT_PROOF_REQUIRED is not mapped as a client validation error');
console.log('Manual payment approval proof guard passed.');
