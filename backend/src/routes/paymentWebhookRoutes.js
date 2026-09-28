const express=require('express');
const rateLimit=require('../middleware/rateLimitMiddleware');
const controller=require('../controllers/paymentWebhookController');

const router=express.Router();
const webhookLimit=rateLimit({windowMs:60*1000,max:240,scope:'route',shared:true,sharedChunkSize:4});
router.post('/',webhookLimit,controller.razorpay);
module.exports=router;
