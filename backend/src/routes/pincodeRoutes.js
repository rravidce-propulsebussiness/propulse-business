const express = require('express');
const pincodeController = require('../controllers/pincodeController');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/', pincodeController.search);
router.get('/resolve', pincodeController.resolve);
router.get('/unmapped', requireAdmin, pincodeController.listUnmapped);
router.post('/detect', requireAdmin, pincodeController.detect);
router.post('/:pincode/map-city', requireAdmin, pincodeController.mapToCity);
router.get('/:pincode', pincodeController.getOne);

module.exports = router;
