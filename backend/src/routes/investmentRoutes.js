const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');
const c = require('../controllers/investmentController');

const investmentWriteLimit = rateLimit({ windowMs: 60 * 1000, max: 10 });
const adminInvestmentWriteLimit = rateLimit({ windowMs: 60 * 1000, max: 30 });
router.get('/access', auth, c.access);
router.get('/rules', auth, c.rules);
router.get('/location-rules', auth, c.locationRules);
router.post('/checkout', auth, investmentWriteLimit, c.checkout);
router.get('/', auth, c.mine);
router.post('/', auth, investmentWriteLimit, c.create);
router.post('/:id/reinvest', auth, investmentWriteLimit, c.reinvest);
router.get('/admin/all', auth, admin, c.adminList);
router.post('/admin/:id/payout', auth, admin, adminInvestmentWriteLimit, c.payout);

module.exports = router;
