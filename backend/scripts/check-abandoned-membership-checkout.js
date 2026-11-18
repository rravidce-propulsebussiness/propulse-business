const assert=require('assert');
const {createWalletFirstPayment}=require('../src/services/paymentService');

function mockClient(pending){
  const calls=[];
  return {calls,async query(sql,params=[]){
    const text=String(sql);calls.push({sql:text,params});
    if(text.includes('pg_advisory_xact_lock'))return{rows:[]};
    if(text.includes("status IN ('pending','processing')"))return{rows:pending?[pending]:[]};
    if(text.includes('FROM wallet_transactions wt WHERE wt.payment_id'))return{rows:[]};
    if(text.includes("SET status='failed'"))return{rows:[],rowCount:1};
    if(text.startsWith('INSERT INTO payments'))return{rows:[{id:51,status:'pending'}]};
    if(text.startsWith('UPDATE payments SET payment_method'))return{rows:[{id:51,status:'pending',payment_method:'manual'}]};
    throw new Error('Unexpected query: '+text.slice(0,100));
  }};
}

async function main(){
  const base={userId:5,totalAmount:2000,purchaseType:'membership',purchaseId:2,membershipPlanId:2,useWallet:false};

  // Closed before paying: no UTR, proof or gateway order -> released and replaced.
  const abandoned=mockClient({id:40,user_id:5,status:'pending',payment_method:'manual',wallet_amount:'501.00',manual_reference:null,proof_url:null,gateway_order_id:null,coupon_id:null,purchase_type:'membership'});
  const result=await createWalletFirstPayment(abandoned,base);
  assert.equal(result.payment.id,51,'A new checkout must be created after an abandoned one');
  assert(abandoned.calls.some(c=>c.sql.includes("SET status='failed'")&&c.params[0]===40),'Abandoned payment must be closed');
  assert(abandoned.calls.some(c=>c.sql.includes('FROM wallet_transactions wt WHERE wt.payment_id')),'Abandoned payment wallet hold must be refunded');

  // Customer already submitted a UTR: keep blocking so admin review is not bypassed.
  const submitted=mockClient({id:41,user_id:5,status:'pending',payment_method:'manual',wallet_amount:'0',manual_reference:'UTR123',proof_url:'private-proof:x',gateway_order_id:null,coupon_id:null,purchase_type:'membership'});
  await assert.rejects(createWalletFirstPayment(submitted,base),error=>error.code==='PAYMENT_PENDING');

  // Other purchase types keep their existing pending behaviour.
  const lead=mockClient({id:42,user_id:5,status:'pending',payment_method:'manual',wallet_amount:'0',manual_reference:null,proof_url:null,gateway_order_id:null,purchase_type:'lead'});
  await assert.rejects(createWalletFirstPayment(lead,{...base,purchaseType:'lead'}),error=>error.code==='PAYMENT_PENDING');

  console.log('Abandoned membership checkout regression tests passed.');
}
main().catch(error=>{console.error(error.stack||error.message);process.exit(1)});
