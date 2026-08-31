const express=require('express');
const requireAuth=require('../middleware/authMiddleware');
const controller=require('../controllers/leadEntitlementController');
const router=express.Router();
router.get('/:id/access',requireAuth,controller.getAccess);
router.post('/:id/claim',requireAuth,controller.claim);
module.exports=router;
