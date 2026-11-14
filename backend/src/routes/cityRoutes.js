const express = require('express');
const cityController = require('../controllers/cityController');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();
require('../utils/numericRouteParams').numericRouteParams(router,'id');

router.get('/', cityController.getCities);
router.get('/:id', cityController.getCityById);
router.post('/', requireAdmin, cityController.createCity);
router.put('/:id', requireAdmin, cityController.updateCity);
router.delete('/:id', requireAdmin, cityController.deactivateCity);

module.exports = router;
