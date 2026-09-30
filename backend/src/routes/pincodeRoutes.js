const express = require('express');
const pincodeController = require('../controllers/pincodeController');
const requireAdmin = require('../middleware/adminMiddleware');
const rateLimit = require('../middleware/rateLimitMiddleware');

const router = express.Router();
const publicLookupLimit = rateLimit({ windowMs: 60 * 1000, max: 30 });

router.get('/', pincodeController.search);
router.get('/resolve', pincodeController.resolve);
router.get('/location/:pincode', publicLookupLimit, pincodeController.locate);
router.get('/unmapped', requireAdmin, pincodeController.listUnmapped);
router.post('/detect', requireAdmin, pincodeController.detect);
router.post('/:pincode/map-city', requireAdmin, pincodeController.mapToCity);
router.get('/:pincode', pincodeController.getOne);

module.exports = router;
