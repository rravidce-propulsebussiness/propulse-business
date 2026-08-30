const express = require('express');
const industryController = require('../controllers/industryController');

const router = express.Router();

router.post('/', industryController.createIndustry);
router.get('/', industryController.getIndustries);
router.get('/:id', industryController.getIndustryById);
router.put('/:id', industryController.updateIndustry);
router.delete('/:id', industryController.deactivateIndustry);

module.exports = router;
