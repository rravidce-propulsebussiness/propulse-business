const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..','..');
const files=[
  'frontend/src/pages/Home.css',
  'frontend/src/pages/RequirementWizard.css',
  'frontend/src/components/InteriorRequirementExact.css',
  'frontend/src/components/RealEstateRequirementExact.css',
  'frontend/src/pages/Projects.css',
  'frontend/src/pages/About.css',
  'frontend/src/pages/HowItWorks.css',
  'frontend/src/pages/Contact.css',
  'frontend/src/components/WebsiteFaqSection.css',
  'frontend/src/pages/EstimatorWizard.css',
  'frontend/src/pages/LeadsV2.css',
  'frontend/src/pages/LeadsV2Payment.css',
  'frontend/src/components/UserHeader.css',
  'frontend/src/pages/Auth.css',
  'frontend/src/pages/AuthExtras.css',
  'frontend/src/pages/Login.css',
  'frontend/src/pages/Signup.css',
  'frontend/src/pages/Industries.css',
  'frontend/src/pages/Membership.css',
  'frontend/src/pages/Notifications.css',
  'frontend/src/pages/PayoutAccount.css',
  'frontend/src/pages/Profile.css',
  'frontend/src/pages/PurchasedLeads.css',
  'frontend/src/pages/PurchasedLeadsCRM.css',
  'frontend/src/pages/WalletV2.css',
  'frontend/src/pages/CouponCheckout.css',
  'frontend/src/components/PaymentMethodSelector.css',
  'frontend/src/components/PaymentProofPicker.css',
  'frontend/src/components/NotificationBell.css',
  'frontend/src/components/MembershipPayments.css'
];

const violations=[];
for(const relative of files){
  const full=path.join(root,relative);
  if(!fs.existsSync(full)){violations.push(`${relative}: missing`);continue}
  const css=fs.readFileSync(full,'utf8');
  for(const match of css.matchAll(/font-size\s*:\s*([0-9]*\.?[0-9]+)px/gi)){
    const size=Number(match[1]);
    if(size<12){
      const before=css.slice(0,match.index);
      const line=before.split('\n').length;
      violations.push(`${relative}:${line} -> ${size}px`);
    }
  }
}
if(violations.length){
  console.error('Customer-facing readability check failed:\n'+violations.join('\n'));
  process.exit(1);
}
console.log('Customer-facing readability check passed: no configured text is below 12px.');
