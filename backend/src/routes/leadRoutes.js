const express = require('express');
const leadController = require('../controllers/leadController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

// Lead administration. Admins can create and manage the marketplace inventory.
router.post('/', requireAuth, requireAdmin, leadController.createLead);
router.get('/', requireAuth, leadController.getLeads);
router.get('/:id', requireAuth, leadController.getLeadById);
router.put('/:id', requireAuth, requireAdmin, leadController.updateLead);
router.patch('/:id/status', requireAuth, requireAdmin, leadController.updateLeadStatus);

module.exports = router;
