const express=require('express');
const controller=require('../controllers/chatController');
const requireAuth=require('../middleware/authMiddleware');
const router=express.Router();
router.use(requireAuth);
router.get('/conversation',controller.getConversation);
router.post('/conversation/messages',controller.sendMessage);
module.exports=router;
