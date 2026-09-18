const express=require('express');
const controller=require('../controllers/chatController');
const adminMiddleware=require('../middleware/adminMiddleware');
const router=express.Router();

router.post('/webhook',controller.telegramWebhook);
router.post('/setup-webhook',adminMiddleware,controller.setupTelegramWebhook);

module.exports=router;
