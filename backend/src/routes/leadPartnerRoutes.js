const express = require('express');
const requireLeadPartner = require('../middleware/leadPartnerMiddleware');
const controller = require('../controllers/leadPartnerController');

const router = express.Router();
router.use(requireLeadPartner);
router.get('/dashboard', controller.dashboard);

module.exports = router;
