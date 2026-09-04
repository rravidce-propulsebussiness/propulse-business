const express = require('express');
const pincodeController = require('../controllers/pincodeController');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/', pincodeController.search);
router.get('/sync/status', requireAdmin, pincodeController.syncStatus);
router.get('/:pincode', pincodeController.getOne);
router.post('/sync/all', requireAdmin, pincodeController.syncAll);
router.post('/sync/state/:stateId', requireAdmin, pincodeController.syncState);

module.exports = router;
