const express = require('express');
const stateController = require('../controllers/stateController');

const router = express.Router();

router.post('/', stateController.createState);
router.get('/', stateController.getStates);
router.get('/:id', stateController.getStateById);
router.post('/:id/sync-cities', stateController.syncCities);
router.put('/:id', stateController.updateState);
router.delete('/:id', stateController.deactivateState);

module.exports = router;
