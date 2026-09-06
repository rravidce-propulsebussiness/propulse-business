const pool=require('../src/config/database');
async function scalar(sql,params=[]){return Number((await pool.query(sql,params)).rows[0].count||0)}
async function main(){
  const required=['purchase_type','purchase_id','wallet_amount','external_amount','wallet_transaction_id'];
  for(const column of required){const n=await scalar(`SELECT COUNT(*)::int AS count FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name=$1`,[column]);if(n!==1)throw new Error(`payments.${column} is missing`)}
  const split=await scalar(`SELECT COUNT(*)::int AS count FROM payments WHERE ROUND(wallet_amount+external_amount,2)<>ROUND(amount,2)`);if(split)throw new Error(`${split} payment rows have an invalid wallet/direct split`)
  const pendingDup=await scalar(`SELECT COUNT(*)::int AS count FROM (SELECT user_id,purchase_type,purchase_id,COUNT(*) c FROM payments WHERE purchase_type IS NOT NULL AND purchase_id IS NOT NULL AND status IN ('pending','processing') GROUP BY user_id,purchase_type,purchase_id HAVING COUNT(*)>1)x`);if(pendingDup)throw new Error(`${pendingDup} duplicate pending purchase payments found`)
  const pendingLead=await scalar(`SELECT COUNT(*)::int AS count FROM lead_purchases WHERE status='pending_payment' AND payment_id IS NULL`);if(pendingLead)throw new Error(`${pendingLead} pending lead purchases have no payment`)
  const negativeWallet=await scalar(`SELECT COUNT(*)::int AS count FROM wallets WHERE balance<0`);if(negativeWallet)throw new Error(`${negativeWallet} wallets have negative balances`)
  const badLedger=await scalar(`SELECT COUNT(*)::int AS count FROM wallet_transactions WHERE amount<=0 OR balance_after<0`);if(badLedger)throw new Error(`${badLedger} wallet transactions have invalid amounts or balances`)
  const duplicatePaymentTx=await scalar(`SELECT COUNT(*)::int AS count FROM (SELECT payment_id,type,COUNT(*) c FROM wallet_transactions WHERE payment_id IS NOT NULL GROUP BY payment_id,type HAVING COUNT(*)>1)x`);if(duplicatePaymentTx)throw new Error(`${duplicatePaymentTx} payments have duplicate wallet transaction types`)
  console.log('Payment and wallet integrity checks passed.')
}
main().then(()=>pool.end()).catch(async e=>{console.error(e.message);await pool.end();process.exit(1)})
