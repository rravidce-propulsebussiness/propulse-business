const express = require('express');
const subserviceController = require('../controllers/subserviceController');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/', subserviceController.getSubservices);
router.get('/:id', subserviceController.getSubserviceById);
router.post('/', requireAdmin, subserviceController.createSubservice);
router.put('/:id', requireAdmin, subserviceController.updateSubservice);
router.delete('/:id', requireAdmin, subserviceController.deactivateSubservice);

module.exports = router;
