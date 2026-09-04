const express = require('express');
const pincodeController = require('../controllers/pincodeController');

const router = express.Router();

router.get('/', pincodeController.search);
router.get('/sync/status', pincodeController.syncStatus);
router.post('/sync/all', pincodeController.syncAll);
router.post('/sync/state/:stateId', pincodeController.syncState);
router.get('/:pincode', pincodeController.getOne);

module.exports = router;
