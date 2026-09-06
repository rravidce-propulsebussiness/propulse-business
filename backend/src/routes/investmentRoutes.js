const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const c = require('../controllers/investmentController');

router.get('/access', auth, c.access);
router.get('/rules', auth, c.rules);
router.get('/location-rules', auth, c.locationRules);
router.get('/', auth, c.mine);
router.post('/', auth, c.create);
router.post('/:id/reinvest', auth, c.reinvest);
router.get('/admin/all', auth, admin, c.adminList);
router.post('/admin/:id/payout', auth, admin, c.payout);

module.exports = router;
