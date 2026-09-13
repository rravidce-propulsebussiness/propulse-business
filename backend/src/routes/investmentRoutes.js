const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');
const c = require('../controllers/investmentController');
const draftService = require('../services/investmentPaymentDraftService');
const payoutAccounts = require('../services/investorPayoutAccountService');
const managedAdSpend = require('../services/managedInvestorAdSpendService');

const investmentWriteLimit = rateLimit({ windowMs: 60 * 1000, max: 10 });
const adminInvestmentWriteLimit = rateLimit({ windowMs: 60 * 1000, max: 30 });

router.get('/access', auth, c.access);
router.get('/rules', auth, c.rules);
router.get('/location-rules', auth, c.locationRules);
router.get('/sold-leads', auth, c.soldLeads);
router.get('/assigned-leads', auth, c.linkedInvestorLeads);
router.get('/funds', auth, c.investorFunds);
router.post('/funds/transfer-request', auth, investmentWriteLimit, c.requestInvestorTransfer);
router.get('/admin/transfer-requests', auth, admin, c.adminInvestorTransferRequests);
router.post('/admin/transfer-requests/:id/process', auth, admin, adminInvestmentWriteLimit, c.adminProcessInvestorTransfer);
router.get('/admin/investor/:userId/payout-account', auth, admin, async (req,res)=>{try{return res.json(await payoutAccounts.get(Number(req.params.userId)))}catch(e){return res.status(500).json({error:e.message||'Failed to load payout account'})}});
router.post('/admin/investor/:userId/managed-ad-spend', auth, admin, adminInvestmentWriteLimit, async (req,res)=>{try{return res.status(201).json(await managedAdSpend.recordSpend({userId:Number(req.params.userId),amount:req.body.amount,platform:req.body.platform,campaign:req.body.campaign,spendDate:req.body.spendDate,reference:req.body.reference,notes:req.body.notes,adminId:req.user.id}))}catch(e){const map={INVALID_SPEND_AMOUNT:400,SPEND_EXCEEDS_AVAILABLE_AD_FUNDS:400,NO_ACTIVE_INVESTMENT:400};return res.status(map[e.code]||500).json({error:e.message||'Failed to record ad spend',code:e.code})}});

router.post('/checkout', auth, investmentWriteLimit, async (req, res, next) => {
  try {
    if (req.body.useWallet === false) {
      const amount = Number(req.body.amount);
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than zero', code: 'INVALID_AMOUNT' });
      const draftId = draftService.create({ userId:req.user.id, industryId:Number(req.body.industryId), stateId:req.body.stateId==null||req.body.stateId===''?null:Number(req.body.stateId), cityId:req.body.cityId==null||req.body.cityId===''?null:Number(req.body.cityId), amount, reinvestmentEnabled:req.body.reinvestmentEnabled === true });
      return res.status(200).json({ draft:true, paymentPending:true, payment:{id:draftId,amount,external_amount:amount,status:'draft',payment_method:'manual'}, investment:{id:null,amount}, reinvestmentEnabled:req.body.reinvestmentEnabled === true });
    }
    return c.checkout(req, res);
  } catch(e){ return next(e); }
});

router.get('/', auth, c.mine);
router.post('/', auth, investmentWriteLimit, c.create);
router.post('/:id/reinvest', auth, investmentWriteLimit, c.reinvest);
router.get('/admin/all', auth, admin, c.adminList);
router.get('/admin/investor/:userId/linked-leads', auth, admin, c.linkedLeads);
router.get('/admin/:id/ad-spend', auth, admin, c.getAdSpend);
router.put('/admin/:id/ad-amount', auth, admin, adminInvestmentWriteLimit, c.updateAdAmount);
router.post('/admin/:id/ad-spend', auth, admin, adminInvestmentWriteLimit, c.recordAdSpend);
router.post('/admin/:id/payout', auth, admin, adminInvestmentWriteLimit, c.payout);

module.exports = router;
