const express = require('express');
const requireLeadPartner = require('../middleware/leadPartnerMiddleware');
const controller = require('../controllers/leadPartnerController');
const inventoryController = require('../controllers/leadPartnerInventoryController');

const router = express.Router();
router.use(requireLeadPartner);
router.get('/dashboard', controller.dashboard);
router.get('/inventory', inventoryController.inventory);
router.post('/inventory/import/google-sheet', inventoryController.importGoogleSheet);
router.post('/inventory/import/csv', inventoryController.importCsv);

module.exports = router;
