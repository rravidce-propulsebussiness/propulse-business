const express = require('express');
const pincodeController = require('../controllers/pincodeController');

const router = express.Router();

router.get('/', pincodeController.search);
router.get('/:pincode', pincodeController.getOne);

module.exports = router;
