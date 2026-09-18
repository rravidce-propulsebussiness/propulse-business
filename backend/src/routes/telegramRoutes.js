const express=require('express');
const controller=require('../controllers/chatController');
const router=express.Router();
router.post('/webhook',controller.telegramWebhook);
module.exports=router;
