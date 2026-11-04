const express = require('express');
const requireAdmin = require('../middleware/adminMiddleware');
const controller = require('../controllers/messagingApiController');

const router = express.Router();
router.use(requireAdmin);
router.get('/overview', controller.getOverview);
router.get('/clients', controller.listClients);
router.post('/clients', controller.createClient);
router.post('/clients/:clientId/revoke', controller.revokeClient);
router.get('/messages', controller.listMessages);

module.exports = router;
