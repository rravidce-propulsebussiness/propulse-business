const fs=require('fs');
const path=require('path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function must(file,tokens){
  const source=read(file);
  for(const token of tokens)if(!source.includes(token))throw new Error(file+' missing '+token);
}

must('src/services/telegramSupportService.js',[
  'TELEGRAM_SUPPORT_APPROVER_MAP',
  "allowed_updates:['message','callback_query']",
  'approverAdminId',
  'answerCallbackQuery',
  'editMessageReplyMarkup',
  'editMessageCaption',
  'sendProofAttachment',
  'FormData',
  'Blob',
]);
must('src/services/telegramPaymentReviewService.js',[
  'telegram_payment_review_map',
  'notifyPaymentReview',
  'notifyWalletTopupReview',
  'updatePaymentStatus',
  'approveTopup',
  'rejectTopup',
  'unmapped_review_message',
  'confirmationRequired',
  'privateProofStorage.getProofDescriptor',
  'sendProofAttachment',
  'mediaReviewCaption',
  'editMessageCaption',
]);
must('src/controllers/supportChatController.js',[
  'telegramPaymentReviewService.processCallback',
  'req.body?.callback_query',
]);
must('src/controllers/paymentController.js',[
  'notifyPaymentReview(updated.id)',
  'notifyPaymentReview(result.id)',
]);
must('src/controllers/walletController.js',[
  'notifyWalletTopupReview(data.id)',
  '!data.auto_approved',
]);
must('src/database/migrations/20261004_telegram_payment_review.sql',[
  'telegram_payment_review_map',
  "PRIMARY KEY(entity_type,entity_id)",
  "CHECK (entity_type IN ('payment','wallet_topup'))",
]);
must('.env.example',[
  'TELEGRAM_SUPPORT_APPROVER_MAP=',
  'Telegram user IDs to existing ProPulse admin user IDs',
]);

const review=read('src/services/telegramPaymentReviewService.js');
for(const forbidden of [
  'UPDATE payments SET status',
  'UPDATE wallet_topups SET status',
  'INSERT INTO memberships',
  'INSERT INTO wallet_transactions',
]){
  if(review.includes(forbidden))throw new Error('Telegram review bridge must reuse existing settlement logic; found '+forbidden);
}
if(!review.includes("require('./paymentService').updatePaymentStatus"))throw new Error('Payment approval must reuse paymentService.updatePaymentStatus');
if(!review.includes("walletService.approveTopup"))throw new Error('Wallet approval must reuse walletService.approveTopup');
if(!review.includes("walletService.rejectTopup"))throw new Error('Wallet rejection must reuse walletService.rejectTopup');

const telegram=read('src/services/telegramSupportService.js');
if(/TELEGRAM_SUPPORT_APPROVER_MAP[^\n]*console\.log/.test(telegram))throw new Error('Telegram approver mapping must not be logged');

console.log('Telegram payment approval static checks passed.');
