const assert=require('assert');
const fs=require('fs');
const fsp=require('fs/promises');
const path=require('path');
const storage=require('../src/services/privateProofStorageService');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

(async()=>{
  const server=read('src/server.js');
  const paymentController=read('src/controllers/paymentController.js');
  const paymentService=read('src/services/paymentService.js');
  const partnerPayout=read('src/services/leadPartnerPayoutService.js');
  const investorPayout=read('src/services/investorPayoutRequestService.js');
  const wallet=read('src/services/walletService.js');
  const walletCoupon=read('src/services/walletCouponService.js');
  const investorTransfer=read('src/services/adminInvestorTransferService.js');
  const investorAdminOps=read('src/services/investorAdminOperationsService.js');
  const investmentRoutes=read('src/routes/investmentRoutes.js');

  assert(server.includes("if(req.path==='/company-proofs'||req.path.startsWith('/company-proofs/'))return res.status(404).json({error:'Not found'});"),'Existing company-proof public-file protection must remain intact');
  assert(server.includes("if(req.path==='/private-proofs'||req.path.startsWith('/private-proofs/'))return res.status(404).json({error:'Not found'});"),'Private proof files must never be exposed by /uploads static hosting');
  assert(paymentController.includes("category:'payments'"),'Payment submissions must move accepted proofs to private file storage');
  assert(paymentController.includes('removeStoredProof(storedProof)'),'Failed payment submissions must clean up private proof files');
  assert(paymentService.includes('materializeProof(row.proof_url'),'Admin payment proof viewing must materialize private references');
  assert(partnerPayout.includes("category:'lead-partner-payouts'"),'Lead Partner payout proofs must use private file storage');
  assert(partnerPayout.includes('materializeProof(row.proof_url'),'Lead Partner proof viewing must materialize private references');
  assert(investorPayout.includes("category:'investor-payouts'"),'Investor payout proofs must use private file storage');
  assert(investorPayout.includes('materializeProof(row.proof_url'),'Investor proof viewing must materialize private references');
  assert(wallet.includes("category:'wallet-topups'"),'Wallet top-up proofs must use private file storage');
  assert(wallet.includes('materializeProof(row.proof_url'),'Wallet proof viewing must materialize private references');
  assert(walletCoupon.includes("category:'wallet-topups'"),'Coupon wallet top-ups with external payment must use private file storage');
  assert(investorTransfer.includes("category:'investor-settlements'"),'Transfer-all investor proofs must use private file storage');
  assert(investorAdminOps.includes("category:'investor-settlements'"),'Per-investment settlement proofs must use private file storage');
  assert(investorAdminOps.includes('materializeProof(row.payout_proof_url'),'Stored investor settlement proofs must be materialized through an authorized service');
  assert(investmentRoutes.includes("router.get('/admin/:id/payout-proof',admin,c.getPayoutProof)"),'Investor settlement proof reads must require admin access');

  const tinyPng=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
  const dataUrl='data:image/png;base64,'+tinyPng.toString('base64');
  const ref=await storage.storeDataUrl(dataUrl,{category:'regression-test',maxBytes:1024});
  assert(ref.startsWith('private-proof:regression-test/'),'Private storage must return an opaque internal reference');
  assert.strictEqual(await storage.materializeProof(ref,{maxBytes:1024}),dataUrl,'Authorized proof materialization must preserve the data URL contract');
  await storage.removeStoredProof(ref);
  let removed=false;
  try{await storage.materializeProof(ref,{maxBytes:1024})}catch(error){removed=error?.code==='ENOENT'}
  assert(removed,'Private proof cleanup must remove the stored file');

  const testDir=path.join(root,'uploads','private-proofs','regression-test');
  await fsp.rm(testDir,{recursive:true,force:true}).catch(()=>{});
  console.log('Private payment/payout proof storage regression test passed.');
})().catch(error=>{console.error(error);process.exit(1)});
