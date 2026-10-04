const fs=require('fs');
const path=require('path');

const migrationPath=path.join(__dirname,'../src/database/migrations/20260925-payment-integrity-hardening.sql');
const source=fs.readFileSync(migrationPath,'utf8');

const required=[
  'uq_payments_manual_reference_normalized',
  'LOWER(BTRIM(manual_reference))',
  'uq_wallet_refund_payment',
  'uq_coupon_redemption_payment',
  'uq_lead_purchase_payment',
  'uq_investment_payment',
  'uq_membership_payment',
  'GROUP BY LOWER(BTRIM(manual_reference))',
  'Multiple lead purchases exist for one payment',
  'Multiple investments exist for one payment'
];

for(const token of required){
  if(!source.includes(token)) throw new Error('Missing payment integrity guard: '+token);
}

console.log('Payment database integrity hardening regression test passed.');
