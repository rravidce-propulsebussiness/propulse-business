const express = require('express');
const leadController = require('../controllers/leadController');
const requireAuth = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');

const router = express.Router();

// Business owners can view available leads after authentication.
router.get('/', requireAuth, leadController.getLeads);
router.get('/:id', requireAuth, leadController.getLeadById);

// Only admins can create and manage marketplace leads.
router.post('/', requireAdmin, leadController.createLead);
router.put('/:id', requireAdmin, leadController.updateLead);
router.patch('/:id/status', requireAdmin, leadController.updateLeadStatus);

module.exports = router;
