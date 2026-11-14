const express = require('express');
const industryController = require('../controllers/industryController');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();
require('../utils/numericRouteParams').numericRouteParams(router,'id');

router.get('/', industryController.getIndustries);
router.get('/:id', industryController.getIndustryById);
router.post('/', requireAdmin, industryController.createIndustry);
router.put('/:id', requireAdmin, industryController.updateIndustry);
router.delete('/:id', requireAdmin, industryController.deactivateIndustry);

module.exports = router;
