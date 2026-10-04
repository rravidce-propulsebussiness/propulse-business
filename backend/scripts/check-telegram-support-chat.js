const fs=require('fs');
const path=require('path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function must(file,tokens){
  const source=read(file);
  for(const token of tokens)if(!source.includes(token))throw new Error(file+' missing '+token);
}

must('src/database/migrations/20261002_telegram_support_chat.sql',[
  'support_chat_settings','support_conversations','support_messages','support_telegram_message_map','access_token_hash'
]);
must('src/services/telegramSupportService.js',[
  'TELEGRAM_SUPPORT_BOT_TOKEN','TELEGRAM_SUPPORT_CHAT_ID','TELEGRAM_SUPPORT_WEBHOOK_SECRET','timingSafeEqual','setWebhook'
]);
must('src/services/supportChatService.js',[
  'hashToken','deliverCustomerMessage','processTelegramUpdate','support_telegram_message_map','adminReply','listAdminConversations','/whoami','Your Telegram user ID is:'
]);
must('src/controllers/supportChatController.js',[
  'x-support-chat-token','x-telegram-bot-api-secret-token','telegramWebhook','adminReply'
]);
must('src/routes/supportChatRoutes.js',[
  '/telegram/webhook','optionalAuth','createLimit','writeLimit'
]);
must('src/server.js',["/api/support-chat","supportChatRoutes"]);
must('src/routes/adminRoutes.js',["/support-chat/settings","/support-chats/:conversationId/reply"]);
must('../frontend/src/components/SupportChatWidget.jsx',[
  'propulse_support_chat_v1','/support-chat/conversations','X-Support-Chat-Token','playSound'
]);
must('../frontend/src/admin/pages/AdminSupportChats.jsx',[
  'Telegram bridge','/admin/support-chats','Send reply','Resolve'
]);
must('../frontend/src/App.jsx',["<SupportChatWidget/>","/admin/support-chats"]);
must('../frontend/src/admin/components/AdminLayout.jsx',["/admin/support-chats","Support Chats"]);

const widget=read('../frontend/src/components/SupportChatWidget.jsx');
if(/TELEGRAM_SUPPORT_BOT_TOKEN|TELEGRAM_SUPPORT_WEBHOOK_SECRET/.test(widget))throw new Error('Telegram secrets must never appear in frontend code');
const telegram=read('src/services/telegramSupportService.js');
if(/console\.log\([^\n]*botToken\(/.test(telegram))throw new Error('Telegram bot token must not be logged');

console.log('Telegram support chat static checks passed.');
