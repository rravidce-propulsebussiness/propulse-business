const express = require('express');
const requireLeadPartner = require('../middleware/leadPartnerMiddleware');
const controller = require('../controllers/leadPartnerController');
const inventoryController = require('../controllers/leadPartnerInventoryController');

const router = express.Router();
router.post('/apply', controller.apply);
router.get('/me', controller.me);
router.get('/my-leads', controller.myLeads);
router.use(requireLeadPartner);
router.post('/leads', controller.createLead);
router.get('/dashboard', controller.dashboard);
router.get('/inventory', inventoryController.inventory);
router.post('/inventory/import/google-sheet', inventoryController.importGoogleSheet);
router.post('/inventory/import/csv', inventoryController.importCsv);
router.get('/pricing', controller.pricing);
router.post('/pricing/config', controller.createPricingRule);
router.put('/pricing/config/:ruleId', controller.savePricingRule);
router.delete('/pricing/config/:ruleId', controller.deletePricingRule);
router.put('/pricing/:leadId', controller.updatePricing);
router.get('/payout-account', controller.payoutAccount);
router.post('/payout-account', controller.savePayoutAccount);

module.exports = router;
