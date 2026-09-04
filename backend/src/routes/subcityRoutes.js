const express = require('express');
const controller = require('../controllers/subcityController');
const requireAdmin = require('../middleware/adminMiddleware');
const router = express.Router();

router.get('/', controller.get);
router.post('/', requireAdmin, controller.create);
router.post('/sync/:cityId', requireAdmin, controller.sync);
router.put('/:id', requireAdmin, controller.update);
router.delete('/:id', requireAdmin, controller.remove);

module.exports = router;
