const express = require('express');
const stateController = require('../controllers/stateController');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/', stateController.getStates);
router.get('/:id', stateController.getStateById);
router.post('/', requireAdmin, stateController.createState);
router.post('/:id/sync-cities', requireAdmin, stateController.syncCities);
router.put('/:id', requireAdmin, stateController.updateState);
router.delete('/:id', requireAdmin, stateController.deactivateState);

module.exports = router;
