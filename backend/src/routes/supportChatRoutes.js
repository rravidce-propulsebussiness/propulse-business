const router=require('express').Router();
const controller=require('../controllers/supportChatController');
const optionalAuth=require('../middleware/optionalAuthMiddleware');
const rateLimit=require('../middleware/rateLimitMiddleware');

const createLimit=rateLimit({windowMs:10*60*1000,max:12});
const writeLimit=rateLimit({windowMs:60*1000,max:40});
const webhookLimit=rateLimit({windowMs:60*1000,max:240});

router.post('/telegram/webhook',webhookLimit,controller.telegramWebhook);
router.get('/config',controller.config);
router.use(optionalAuth);
router.get('/current',controller.current);
router.post('/conversations',createLimit,controller.create);
router.get('/conversations/:conversationId',controller.getConversation);
router.post('/conversations/:conversationId/messages',writeLimit,controller.sendMessage);
router.post('/conversations/:conversationId/resolve',writeLimit,controller.resolve);

module.exports=router;
