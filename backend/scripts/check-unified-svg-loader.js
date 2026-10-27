const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=relative=>fs.readFileSync(path.join(__dirname,'../..',relative),'utf8');
const loader=read('frontend/src/components/BootLoader.jsx');
const css=read('frontend/src/components/BootLoader.css');
const html=read('frontend/index.html');
assert.match(loader,/Get your next project/);
assert.match(html,/Get your next project/);
assert.match(loader,/contained=false,compact=false/);
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(css,/\.propulse-route-loading\.is-contained/);
assert.match(css,/\.propulse-route-loading\.is-compact/);
assert(html.indexOf('id="propulse-boot-screen"')<html.indexOf('id="root"'),
  'Boot animation must be rendered before the app for first-paint protection');
const pages=[
  'pages/Membership.jsx','pages/Wallet.jsx','pages/LeadsV2.jsx','pages/PurchasedLeads.jsx',
  'pages/Profile.jsx','pages/Notifications.jsx','pages/ProfessionalRequests.jsx',
  'pages/ProfessionalDetails.jsx','pages/Experts.jsx','pages/ProjectDetail.jsx',
  'pages/PayoutAccount.jsx','pages/LeadPartnerHome.jsx','pages/LeadPartnerInventory.jsx',
  'pages/LeadPartnerPricing.jsx','pages/LeadPartnerAccount.jsx','pages/LeadPartnerReports.jsx',
  'pages/LeadPartnerWithdrawals.jsx','pages/InvestorInvestmentSection.jsx',
  'pages/InvestorCycleHistory.jsx','pages/InvestmentCycleDashboard.jsx',
  'admin/pages/AdminDashboard.jsx','admin/pages/AdminCoupons.jsx',
  'admin/pages/AdminUsers.jsx','admin/pages/AdminCompanyProofs.jsx',
  'admin/pages/AdminPayments.jsx','admin/pages/AdminProfessionalOffers.jsx',
  'admin/pages/AdminLeadEntitlements.jsx','admin/pages/AdminLeadReports.jsx',
  'admin/pages/AdminLeadPartners.jsx','admin/pages/AdminLeadPartnerPayouts.jsx',
  'admin/pages/AdminInvestorWithdrawals.jsx','admin/pages/AdminMembershipPlansConfig.jsx',
  'admin/pages/AdminSoundEffects.jsx','admin/pages/AdminFaqs.jsx','admin/pages/AdminUpcomingFeatures.jsx',
  'admin/pages/AdminRiskCenter.jsx','admin/pages/AdminAuditTimeline.jsx',
  'admin/pages/AdminHomepageMedia.jsx','admin/pages/AdminExpertDirectory.jsx',
  'admin/components/AdminPaymentDetails.jsx','admin/pages/AdminContactSocial.jsx',
  'admin/pages/AdminSystemHealth.jsx','admin/pages/AdminPerformanceCenter.jsx',
  'admin/pages/AdminBackgroundJobs.jsx'
];
for(const relative of pages){
  const source=read('frontend/src/'+relative);
  assert.match(source,/import BootLoader from /,'Shared loader must be imported: '+relative);
  assert.match(source,/<BootLoader\s/,'Visible loader must be rendered: '+relative);
}
for(const [relative,legacy] of [
  ['pages/Membership.jsx','Loading membership options…'],
  ['pages/Wallet.jsx','Loading wallet…'],
  ['pages/Profile.jsx','Loading your business profile…'],
  ['pages/LeadPartnerInventory.jsx','Loading inventory…'],
  ['pages/Notifications.jsx','Loading notifications…']
]){
  assert(!read('frontend/src/'+relative).includes(legacy),
    'Old text-only loader has been removed from '+relative);
}
console.log('Shared ProPulse SVG loader and Get your next project tagline verified across '+pages.length+' screens.');
