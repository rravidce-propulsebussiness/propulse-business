const pool = require('../config/database');
const walletService = require('./walletService');
const couponService = require('./couponService');
const leadPurchaseService = require('./leadPurchaseService');

async function updateLeadPaymentStatus({paymentId,status,notes}) {
  if (!['paid','rejected','failed'].includes(status)) throw Object.assign(new Error('Only paid, rejected, or failed are valid admin review outcomes'),{code:'INVALID_PAYMENT_TRANSITION'});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`admin-payment:${paymentId}`]);
    const payment=(await client.query(`SELECT * FROM payments WHERE id=$1 FOR UPDATE`,[paymentId])).rows[0];
    if(!payment) throw Object.assign(new Error('Payment not found'),{code:'NOT_FOUND'});
    if(payment.purchase_type!=='lead') throw Object.assign(new Error('This approval handler only supports lead payments'),{code:'INVALID_PURCHASE'});
    if(payment.status!=='pending') throw Object.assign(new Error('Payment is already reviewed'),{code:'PAYMENT_TERMINAL'});
    if(payment.payment_method!=='manual') throw Object.assign(new Error('Only manual lead payments can be reviewed here'),{code:'PAYMENT_NOT_MANUAL'});

    if(status==='paid') {
      if(Number(payment.external_amount)>0&&!String(payment.manual_reference||'').trim()) throw Object.assign(new Error('Customer payment reference / UTR is required before approval'),{code:'REFERENCE_REQUIRED'});
      if(Number(payment.external_amount)>0&&!String(payment.proof_url||'').trim()) throw Object.assign(new Error('Customer payment proof is required before approval'),{code:'PROOF_REQUIRED'});
      if(Number(payment.wallet_amount)>0&&!payment.wallet_transaction_id){
        const wallet=(await client.query(`SELECT balance FROM wallets WHERE user_id=$1 FOR UPDATE`,[payment.user_id])).rows[0];
        const balance=Number(wallet?.balance||0),required=Number(payment.wallet_amount||0);
        if(balance+0.000001<required) throw Object.assign(new Error(`Wallet balance is insufficient to capture ₹${required.toFixed(2)}. Current balance is ₹${balance.toFixed(2)}.`),{code:'INSUFFICIENT_BALANCE'});
        const debit=await walletService.debitForPayment(client,{userId:payment.user_id,amount:required,paymentId:payment.id,referenceType:'lead',referenceId:payment.purchase_id,description:`Lead #${payment.purchase_id} purchase`});
        if(Number(debit.walletAmount)+0.000001<required) throw Object.assign(new Error('Unable to capture the reserved wallet amount for this payment'),{code:'INSUFFICIENT_BALANCE'});
        payment.wallet_transaction_id=debit.walletTransactionId;
      }
      const updated=payment.wallet_transaction_id
        ?(await client.query(`UPDATE payments SET status='paid',wallet_transaction_id=$1,paid_at=CURRENT_TIMESTAMP,notes=COALESCE($2,notes),updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *`,[payment.wallet_transaction_id,notes||null,payment.id])).rows[0]
        :(await client.query(`UPDATE payments SET status='paid',paid_at=CURRENT_TIMESTAMP,notes=COALESCE($1,notes),updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`,[notes||null,payment.id])).rows[0];
      await leadPurchaseService.completePendingPurchase(client,{paymentId:payment.id,userId:payment.user_id});
      if(payment.coupon_id) await couponService.redeemForPayment(client,payment.id);
      await client.query('COMMIT');
      return updated;
    }

    if(payment.coupon_id) await couponService.releaseForPayment(client,payment.id);
    await client.query(`DELETE FROM lead_purchases WHERE payment_id=$1 AND status='pending_payment'`,[payment.id]);
    const updated=(await client.query(`UPDATE payments SET status=$1,notes=COALESCE($2,notes),updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *`,[status,notes||null,payment.id])).rows[0];
    await client.query('COMMIT');
    return updated;
  } catch(error) { try{await client.query('ROLLBACK')}catch{} throw error; }
  finally { client.release(); }
}

module.exports={updateLeadPaymentStatus};
