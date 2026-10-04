const express=require('express');
const optionalAuth=require('../middleware/optionalAuthMiddleware');
const rateLimit=require('../middleware/rateLimitMiddleware');
const observabilityController=require('../controllers/observabilityController');

const router=express.Router();
const clientErrorLimit=rateLimit({windowMs:60*1000,max:30,scope:'observability-client-errors',shared:true,sharedChunkSize:5});

router.post('/client-errors',clientErrorLimit,optionalAuth,observabilityController.reportClientError);

module.exports=router;
