const express=require('express');
const requireLeadPartner=require('../middleware/leadPartnerMiddleware');
const controller=require('../controllers/faqController');
const router=express.Router();
router.use(requireLeadPartner);
router.get('/',controller.list);
module.exports=router;