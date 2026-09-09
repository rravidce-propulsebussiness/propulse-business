const pool=require('../config/database')
const couponService=require('./couponService')

async function createTopupWithCoupon({userId,amount,reference,proofUrl,couponCode}){
  const value=Number(amount)
  if(!Number.isFinite(value)||value<=0)throw Object.assign(new Error('Amount must be greater than zero'),{code:'INVALID_AMOUNT'})
  const normalizedReference=reference==null?null:String(reference).trim()||null
  const code=String(couponCode||'').trim()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    if(normalizedReference)await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`wallet-topup-reference:${normalizedReference.toLowerCase()}`])
    if(normalizedReference){const duplicate=(await client.query('SELECT id FROM wallet_topups WHERE LOWER(BTRIM(reference))=LOWER(BTRIM($1)) LIMIT 1',[normalizedReference])).rows[0];if(duplicate)throw Object.assign(new Error('This payment reference / UTR has already been submitted'),{code:'DUPLICATE_REFERENCE'})}
    const coupon=code?await couponService.validateForUser({client,userId,code,subtotal:value,purchaseType:'wallet_topup'}):null
    const payable=coupon?coupon.finalAmount:value
    const isFullyDiscounted=Boolean(coupon&&payable===0)
    if(!coupon&&payable<=0)throw Object.assign(new Error('Amount must be greater than zero'),{code:'INVALID_AMOUNT'})
    if(coupon&&!isFullyDiscounted&&payable<=0)throw Object.assign(new Error('Coupon discount cannot make a wallet top-up payment zero unless the coupon fully covers the amount'),{code:'INVALID_AMOUNT'})
    if(isFullyDiscounted){
      const topup=(await client.query(`INSERT INTO wallet_topups(user_id,amount,reference,proof_url,payment_method,status,reviewed_at) VALUES($1,$2,$3,$4,'manual','approved',CURRENT_TIMESTAMP) RETURNING *`,[userId,value,null,null])).rows[0]
      const payment=(await client.query(`INSERT INTO payments(user_id,amount,payment_method,status,wallet_amount,external_amount,purchase_type,purchase_id,notes,coupon_id,coupon_code,subtotal_amount,discount_amount,paid_at) VALUES($1,0,'manual','paid',0,0,'wallet_topup',$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP) RETURNING *`,[userId,topup.id,`Wallet top-up #${topup.id} fully covered by coupon`,coupon.coupon.id,coupon.coupon.code,value,coupon.discountAmount])).rows[0]
      const w=(await client.query(`INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING *`,[userId])).rows[0]
      const locked=(await client.query(`SELECT id,balance FROM wallets WHERE id=$1 FOR UPDATE`,[w.id])).rows[0]
      const next=Number((Number(locked.balance||0)+value).toFixed(2))
      await client.query(`UPDATE wallets SET balance=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`,[next,locked.id])
      const tx=(await client.query(`INSERT INTO wallet_transactions(wallet_id,user_id,type,amount,balance_after,reference_type,reference_id,payment_id,description) VALUES($1,$2,'credit',$3,$4,'wallet_topup',$5,$6,$7) RETURNING *`,[locked.id,userId,value,next,topup.id,payment.id,`Wallet top-up ${topup.id} credited by 100% coupon ${coupon.coupon.code}`])).rows[0]
      await client.query(`UPDATE payments SET wallet_transaction_id=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`,[tx.id,payment.id])
      const redemption=await couponService.reserveRedemption(client,{couponId:coupon.coupon.id,userId,paymentId:payment.id,purchaseType:'wallet_topup',purchaseId:topup.id,discountAmount:coupon.discountAmount})
      await couponService.redeemForPayment(client,payment.id)
      await client.query('COMMIT')
      return {...topup,payment_id:payment.id,subtotal_amount:value,discount_amount:coupon.discountAmount,payable_amount:0,wallet_credited_amount:value,auto_approved:true,coupon:{code:coupon.coupon.code,discountAmount:coupon.discountAmount,subtotalAmount:value,finalAmount:0},redemption_id:redemption?.id||null}
    }
    if(!normalizedReference)throw Object.assign(new Error('Payment reference / UTR is required for a discounted top-up with an amount to pay'),{code:'REFERENCE_REQUIRED'})
    const topup=(await client.query(`INSERT INTO wallet_topups(user_id,amount,reference,proof_url) VALUES($1,$2,$3,$4) RETURNING *`,[userId,value,normalizedReference,proofUrl||null])).rows[0]
    const payment=(await client.query(`INSERT INTO payments(user_id,amount,payment_method,status,wallet_amount,external_amount,purchase_type,purchase_id,notes,coupon_id,coupon_code,subtotal_amount,discount_amount) VALUES($1,$2,'manual','pending',0,$2,'wallet_topup',$3,$4,$5,$6,$7,$8) RETURNING *`,[userId,payable,topup.id,`Wallet top-up #${topup.id}`,coupon?.coupon?.id||null,coupon?.coupon?.code||null,value,coupon?.discountAmount||0])).rows[0]
    if(coupon)await couponService.reserveRedemption(client,{couponId:coupon.coupon.id,userId,paymentId:payment.id,purchaseType:'wallet_topup',purchaseId:topup.id,discountAmount:coupon.discountAmount})
    await client.query('COMMIT')
    return {...topup,payment_id:payment.id,subtotal_amount:value,discount_amount:coupon?.discountAmount||0,payable_amount:payable,coupon:coupon?{code:coupon.coupon.code,discountAmount:coupon.discountAmount,subtotalAmount:value,finalAmount:payable}:null}
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}

async function syncApprovedTopup({topupId,client:providedClient=null}){
  const client=providedClient||await pool.connect();const ownsTransaction=!providedClient
  try{
    if(ownsTransaction)await client.query('BEGIN')
    const payment=(await client.query(`SELECT * FROM payments WHERE purchase_type='wallet_topup' AND purchase_id=$1 FOR UPDATE`,[topupId])).rows[0]
    if(payment&&payment.status==='pending'){
      await client.query(`UPDATE payments SET status='paid',payment_method='manual',paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[payment.id])
      if(payment.coupon_id)await couponService.redeemForPayment(client,payment.id)
    }
    if(ownsTransaction)await client.query('COMMIT')
    return payment
  }catch(e){if(ownsTransaction)await client.query('ROLLBACK');throw e}finally{if(ownsTransaction)client.release()}
}

async function syncRejectedTopup({topupId,client:providedClient=null}){
  const client=providedClient||await pool.connect();const ownsTransaction=!providedClient
  try{
    if(ownsTransaction)await client.query('BEGIN')
    const payment=(await client.query(`SELECT * FROM payments WHERE purchase_type='wallet_topup' AND purchase_id=$1 FOR UPDATE`,[topupId])).rows[0]
    if(payment&&payment.status==='pending'){
      await client.query(`UPDATE payments SET status='rejected',updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[payment.id])
      if(payment.coupon_id)await couponService.releaseForPayment(client,payment.id)
    }
    if(ownsTransaction)await client.query('COMMIT')
    return payment
  }catch(e){if(ownsTransaction)await client.query('ROLLBACK');throw e}finally{if(ownsTransaction)client.release()}
}
module.exports={createTopupWithCoupon,syncApprovedTopup,syncRejectedTopup}
