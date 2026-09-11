const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');
const c = require('../controllers/investmentController');
const draftService = require('../services/investmentPaymentDraftService');

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

router.post('/checkout', auth, investmentWriteLimit, async (req, res, next) => {
  try {
    if (req.body.useWallet === false) {
      const amount = Number(req.body.amount);
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than zero', code: 'INVALID_AMOUNT' });
      const draftId = draftService.create({
        userId:req.user.id,
        industryId:Number(req.body.industryId),
        stateId:req.body.stateId==null||req.body.stateId===''?null:Number(req.body.stateId),
        cityId:req.body.cityId==null||req.body.cityId===''?null:Number(req.body.cityId),
        amount,
        reinvestmentEnabled:req.body.reinvestmentEnabled === true,
      });
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
router.post('/admin/:id/payout', auth, admin, adminInvestmentWriteLimit, c.payout);

module.exports = router;
