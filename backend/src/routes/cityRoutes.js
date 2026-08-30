const express = require('express');
const cityController = require('../controllers/cityController');

const router = express.Router();

router.post('/', cityController.createCity);
router.get('/', cityController.getCities);
router.get('/:id', cityController.getCityById);
router.put('/:id', cityController.updateCity);
router.delete('/:id', cityController.deactivateCity);

module.exports = router;
