const express=require('express');const leadController=require('../controllers/leadController');const requireAuth=require('../middleware/authMiddleware');const requireAdmin=require('../middleware/adminMiddleware');const router=express.Router();
// Public browsing: visitors can discover available leads; purchase/admin actions remain protected.
router.get('/',leadController.getLeads);
router.get('/pricing',requireAdmin,leadController.getLeadPricing);
router.put('/pricing',requireAdmin,leadController.updateLeadPricing);
router.get('/pricing/rules',requireAdmin,leadController.getPricingRules);
router.post('/pricing/rules',requireAdmin,leadController.savePricingRule);
router.put('/pricing/rules/:id',requireAdmin,leadController.savePricingRule);
router.delete('/pricing/rules/:id',requireAdmin,leadController.deletePricingRule);
router.get('/:id',requireAuth,leadController.getLeadById);router.post('/',requireAdmin,leadController.createLead);router.put('/:id',requireAdmin,leadController.updateLead);router.patch('/:id/status',requireAdmin,leadController.updateLeadStatus);router.delete('/:id',requireAdmin,leadController.deleteLead);module.exports=router;
