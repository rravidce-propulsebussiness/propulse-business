require('dotenv').config();
const telegram=require('../src/services/telegramSupportService');

async function main(){
  const status=telegram.status();
  if(!status.botTokenConfigured)throw new Error('TELEGRAM_SUPPORT_BOT_TOKEN is required');
  if(!status.chatIdConfigured)throw new Error('TELEGRAM_SUPPORT_CHAT_ID is required');
  if(!status.webhookSecretConfigured)throw new Error('TELEGRAM_SUPPORT_WEBHOOK_SECRET must be 16-256 characters using letters, numbers, _ or -');
  if(!status.webhookUrl)throw new Error('Set PUBLIC_APP_URL or TELEGRAM_SUPPORT_WEBHOOK_URL to an externally reachable HTTPS URL');
  if(!/^https:\/\//i.test(status.webhookUrl))throw new Error('Telegram webhook URL must use HTTPS');
  const result=await telegram.configureWebhook();
  console.log('Telegram support webhook configured successfully.');
  console.log('Webhook URL:',status.webhookUrl);
  console.log('Telegram response message id/status:',result?.url||result?.description||'ok');
}

main().catch(error=>{
  console.error('Telegram support webhook setup failed:',error?.message||error);
  process.exitCode=1;
});
