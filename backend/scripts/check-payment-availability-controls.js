const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(v,m)=>{if(!v)throw new Error(m)};

const migration=read('src/database/migrations/20260928_payment_availability_settings.sql');
const settings=read('src/services/paymentAvailabilityService.js');
const gateway=read('src/services/paymentGatewayService.js');
const payment=read('src/services/paymentService.js');
const wallet=read('src/services/walletService.js');
const walletCoupon=read('src/services/walletCouponService.js');
const receiving=read('src/services/paymentReceivingDetailsService.js');
const routes=read('src/routes/paymentReceivingDetailsRoutes.js');
const admin=read('../frontend/src/admin/components/AdminPaymentDetails.jsx');
const selector=read('../frontend/src/components/PaymentMethodSelector.jsx');
const membership=read('../frontend/src/pages/Membership.jsx');
const leads=read('../frontend/src/pages/LeadsV2.jsx');
const walletUi=read('../frontend/src/pages/Wallet.jsx');
const investment=read('../frontend/src/pages/InvestmentCycleDashboard.jsx');

assert(migration.includes('CREATE TABLE IF NOT EXISTS payment_availability_settings'),'Payment availability settings migration is missing');
assert(migration.includes("online_display_mode IN ('live','coming_soon','hidden')"),'Online display mode constraint is missing');
assert(settings.includes("action:'payment.availability_settings'"),'Admin payment availability changes must be audited');
assert(settings.includes("code:'OFFLINE_PAYMENT_DISABLED'")&&settings.includes("code:'GATEWAY_COMING_SOON'")&&settings.includes("code:'GATEWAY_DISABLED'"),'Payment mode enforcement errors are missing');
assert(gateway.includes('paymentAvailability.requireOnline(client)'),'Gateway order creation must enforce Admin online availability');
assert(payment.includes('paymentAvailability.requireOffline'),'Manual payment proof submission must enforce Admin offline availability');
assert(wallet.includes('paymentAvailability.requireOffline(client)')&&walletCoupon.includes('paymentAvailability.requireOffline(client)'),'Manual wallet top-ups must enforce Admin offline availability');
assert(walletCoupon.includes('paymentAvailability.requireOnline(client)'),'Gateway wallet top-ups must enforce Admin online availability');
assert(receiving.includes('if(!availability.offlineEnabled)return []'),'Offline receiving accounts must be hidden when manual payment is disabled');
assert(routes.includes("'/admin/options'")&&routes.includes("'/options'"),'Payment availability API routes are missing');

assert(admin.includes('PAYMENT AVAILABILITY')&&admin.includes('Show “Coming Soon”')&&admin.includes('Save payment modes'),'Admin payment mode switchboard is missing');
assert(selector.includes('COMING SOON')&&selector.includes("onlineDisplayMode!=='hidden'"),'Customer selector must support Coming Soon and Hidden modes');
for(const [name,source] of Object.entries({membership,leads,walletUi,investment})){
  assert(source.includes('PaymentMethodSelector'),`${name} payment UI does not use the shared payment method selector`);
  assert(source.includes('runRazorpayCheckout'),`${name} payment UI does not use the shared Razorpay launcher`);
}
console.log('Payment availability controls regression test passed.');
