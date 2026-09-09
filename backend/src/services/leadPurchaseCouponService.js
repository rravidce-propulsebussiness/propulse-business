const pool=require('../config/database')
const couponService=require('./couponService')
const walletService=require('./walletService')
const base=require('./leadPurchaseService')

async function clearConflictingPending({leadId,userId}) {
  const client=await pool.connect()
  try {
    await client.query('BEGIN')
    const pending=(await client.query(`SELECT lp.id AS lead_purchase_id,p.id AS payment_id,p.wallet_amount,p.manual_reference,p.proof_url FROM lead_purchases lp JOIN payments p ON p.id=lp.payment_id WHERE lp.lead_id=$1 AND lp.user_id=$2 AND lp.status='pending_payment' AND p.status='pending' ORDER BY lp.id DESC LIMIT 1 FOR UPDATE OF lp,p`,[leadId,userId])).rows[0]
    if(!pending){await client.query('COMMIT');return}
    const hasSubmittedProof=Boolean(String(pending.manual_reference||'').trim()||String(pending.proof_url||'').trim())
    if(hasSubmittedProof){await client.query('COMMIT');return}
    if(Number(pending.wallet_amount||0)>0){await walletService.refundForPayment(client,{userId,paymentId:pending.payment_id,description:`Refund wallet allocation for superseded Lead #${leadId} payment`})}
    await couponService.releaseForPayment(client,pending.payment_id)
    await client.query(`DELETE FROM lead_purchases WHERE id=$1 AND status='pending_payment'`,[pending.lead_purchase_id])
    await client.query(`UPDATE payments SET status='failed',notes=CONCAT(COALESCE(notes,''),' [Superseded by a new lead purchase selection]'),updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND status='pending'`,[pending.payment_id])
    await client.query('COMMIT')
  } catch(e) {try{await client.query('ROLLBACK')}catch{}throw e} finally {client.release()}
}

async function purchaseLead(args){await clearConflictingPending(args);return base.purchaseLead(args)}
async function quoteLead(args){await clearConflictingPending(args);return base.quoteLead(args)}

module.exports={...base,purchaseLead,quoteLead}
