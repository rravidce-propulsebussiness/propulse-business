// Regression: verified-fake refunds stored the payment id as wallet_transactions.balance_after
// (e.g. "balance after ₹1.00" for payment #1) instead of the new wallet balance.
const fs=require('fs');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'..','src','services','leadReportService.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const fn=source.slice(source.indexOf('async function refundPaymentToWallet'));
assert(fn.length>0,'refundPaymentToWallet must exist');
const insert=fn.match(/INSERT INTO wallet_transactions\(wallet_id,user_id,type,amount,balance_after,[^`]*`,\[([^\]]*)\]/);
assert(insert,'refundPaymentToWallet must insert a wallet_transactions row');
const params=insert[1].split(',').map(x=>x.trim());
assert(params[3]==='next','Refund balance_after ($4) must be the new wallet balance (next), not '+params[3]);
console.log('Fake lead refund balance regression test passed.');
