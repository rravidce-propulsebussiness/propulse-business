const express = require('express');
const serviceController = require('../controllers/serviceController');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/', serviceController.getServices);
router.get('/:id', serviceController.getServiceById);
router.post('/', requireAdmin, serviceController.createService);
router.put('/:id', requireAdmin, serviceController.updateService);
router.delete('/:id', requireAdmin, serviceController.deactivateService);

module.exports = router;
