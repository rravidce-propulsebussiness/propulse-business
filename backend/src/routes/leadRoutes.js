const express = require('express');
const leadController = require('../controllers/leadController');
const requireAuth = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();
router.get('/', requireAuth, leadController.getLeads);
router.get('/:id', requireAuth, leadController.getLeadById);
router.post('/', requireAdmin, leadController.createLead);
router.put('/:id', requireAdmin, leadController.updateLead);
router.patch('/:id/status', requireAdmin, leadController.updateLeadStatus);
router.delete('/:id', requireAdmin, leadController.deleteLead);

module.exports = router;
