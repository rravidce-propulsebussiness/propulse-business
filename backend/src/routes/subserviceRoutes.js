const express = require('express');
const subserviceController = require('../controllers/subserviceController');

const router = express.Router();

router.post('/', subserviceController.createSubservice);
router.get('/', subserviceController.getSubservices);
router.get('/:id', subserviceController.getSubserviceById);
router.put('/:id', subserviceController.updateSubservice);
router.delete('/:id', subserviceController.deactivateSubservice);

module.exports = router;
