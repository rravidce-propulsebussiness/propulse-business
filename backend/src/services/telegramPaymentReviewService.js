const pool=require('../config/database');
const telegram=require('./telegramSupportService');
const privateProofStorage=require('./privateProofStorageService');

function clean(value){return String(value??'').trim();}
function money(value){return '₹'+Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});}
function dateTime(value){
  if(!value)return '—';
  try{return new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
  catch{return String(value);}
}
function adminUrl(){
  const base=clean(process.env.PUBLIC_APP_URL).replace(/\/+$/,'');
  return /^https:\/\//i.test(base)?base+'/admin/payments':'';
}
function shortName(row){return row.business_name||row.user_name||row.user_email||'Customer';}
function purchaseLabel(row){
  const type=clean(row.purchase_type||'payment').toLowerCase();
  if(type==='membership')return row.membership_plan_name?('Membership · '+row.membership_plan_name):'Membership';
  if(type==='lead')return 'Lead purchase'+(row.purchase_id?' #'+row.purchase_id:'');
  if(type==='investment')return 'Investment'+(row.purchase_id?' #'+row.purchase_id:'');
  if(type==='wallet_topup')return 'Wallet top-up'+(row.purchase_id?' #'+row.purchase_id:'');
  return type||'Payment';
}
function outcomeLabel(status){
  const normalized=clean(status).toLowerCase();
  if(['paid','approved'].includes(normalized))return '✅ APPROVED';
  if(normalized==='rejected')return '❌ REJECTED';
  return '⏳ PENDING REVIEW';
}
function paymentText(row){
  return [
    '💰 ProPulse Payment Review',
    '',
    'Payment: #'+row.id,
    'Customer: '+shortName(row),
    'Email: '+(row.user_email||'—'),
    'Type: '+purchaseLabel(row),
    'Total: '+money(row.amount),
    Number(row.wallet_amount||0)>0?'Wallet used: '+money(row.wallet_amount):null,
    'Direct payment: '+money(row.external_amount),
    'UTR / Reference: '+(row.manual_reference||'—'),
    'Proof: '+(row.has_proof?'Uploaded':'Missing'),
    'Submitted: '+dateTime(row.updated_at||row.created_at),
    '',
    outcomeLabel(row.status),
  ].filter(Boolean).join('\n').slice(0,3900);
}
function topupText(row){
  return [
    '💰 ProPulse Wallet Top-up Review',
    '',
    'Top-up: #'+row.id,
    'Customer: '+shortName(row),
    'Email: '+(row.user_email||'—'),
    'Wallet amount: '+money(row.amount),
    'UTR / Reference: '+(row.reference||'—'),
    'Proof: '+(row.has_proof?'Uploaded':'Missing'),
    'Submitted: '+dateTime(row.updated_at||row.created_at),
    '',
    outcomeLabel(row.status),
  ].join('\n').slice(0,3900);
}
function codeKind(entityType){return entityType==='payment'?'p':'w';}
function entityType(kind){return kind==='p'?'payment':kind==='w'?'wallet_topup':null;}
function callback(kind,id,action){return ['pr',kind,String(id),action].join(':').slice(0,64);}
function reviewKeyboard(type,id){
  const kind=codeKind(type);
  const rows=[
    [
      {text:'✅ Approve',callback_data:callback(kind,id,'a')},
      {text:'❌ Reject',callback_data:callback(kind,id,'r')},
    ],
  ];
  const url=adminUrl();
  if(url)rows.push([{text:'🔎 Open Admin Payments',url}]);
  return{inline_keyboard:rows};
}
function confirmKeyboard(type,id,decision){
  const kind=codeKind(type);
  const approve=decision==='approve';
  return{inline_keyboard:[
    [{text:approve?'✅ Confirm approval':'❌ Confirm rejection',callback_data:callback(kind,id,approve?'ca':'cr')}],
    [{text:'↩ Cancel',callback_data:callback(kind,id,'x')}],
  ]};
}
function emptyKeyboard(){return{inline_keyboard:[]};}

async function loadPayment(id){
  return (await pool.query(
    `SELECT p.*,u.name AS user_name,u.email AS user_email,bp.business_name,mp.name AS membership_plan_name,
            (COALESCE(BTRIM(p.proof_url),'')<>'') AS has_proof
       FROM payments p
       JOIN users u ON u.id=p.user_id
       LEFT JOIN business_profiles bp ON bp.user_id=u.id
       LEFT JOIN membership_plans mp ON mp.id=p.membership_plan_id
      WHERE p.id=$1`,
    [Number(id)]
  )).rows[0]||null;
}
async function loadTopup(id){
  return (await pool.query(
    `SELECT wt.*,u.name AS user_name,u.email AS user_email,bp.business_name,
            (COALESCE(BTRIM(wt.proof_url),'')<>'') AS has_proof
       FROM wallet_topups wt
       JOIN users u ON u.id=wt.user_id
       LEFT JOIN business_profiles bp ON bp.user_id=u.id
      WHERE wt.id=$1`,
    [Number(id)]
  )).rows[0]||null;
}
async function loadEntity(type,id){return type==='payment'?loadPayment(id):loadTopup(id);}
function renderEntity(type,row){return type==='payment'?paymentText(row):topupText(row);}

async function claimReviewMessage(type,id){
  const inserted=(await pool.query(
    `INSERT INTO telegram_payment_review_map(entity_type,entity_id,telegram_chat_id,status)
     VALUES($1,$2,$3,'pending')
     ON CONFLICT(entity_type,entity_id) DO NOTHING
     RETURNING *`,
    [type,Number(id),String(telegram.expectedChatId())]
  )).rows[0];
  if(inserted)return{claimed:true,row:inserted};
  const existing=(await pool.query(
    'SELECT * FROM telegram_payment_review_map WHERE entity_type=$1 AND entity_id=$2',
    [type,Number(id)]
  )).rows[0]||null;
  return{claimed:false,row:existing};
}
async function releaseClaim(type,id){
  await pool.query(
    'DELETE FROM telegram_payment_review_map WHERE entity_type=$1 AND entity_id=$2 AND telegram_message_id IS NULL',
    [type,Number(id)]
  );
}
async function attachMessage(type,id,messageId){
  await pool.query(
    `UPDATE telegram_payment_review_map
        SET telegram_chat_id=$1,telegram_message_id=$2,updated_at=CURRENT_TIMESTAMP
      WHERE entity_type=$3 AND entity_id=$4`,
    [String(telegram.expectedChatId()),Number(messageId),type,Number(id)]
  );
}
async function setReviewStatus(type,id,status){
  await pool.query(
    `UPDATE telegram_payment_review_map SET status=$1,updated_at=CURRENT_TIMESTAMP
      WHERE entity_type=$2 AND entity_id=$3`,
    [status,type,Number(id)]
  );
}

async function sendProof(type,id,row,reviewMessageId){
  if(!row?.proof_url)return{status:'missing'};
  try{
    const descriptor=await privateProofStorage.getProofDescriptor(row.proof_url);
    if(!descriptor)return{status:'missing'};
    const label=type==='payment'?'Payment':'Wallet top-up';
    const sent=await telegram.sendProofAttachment({
      descriptor,
      caption:'📎 '+label+' #'+id+' proof',
      replyToMessageId:reviewMessageId,
    });
    return{status:'sent',messageId:sent?.message_id||null};
  }catch(error){
    console.error('Telegram payment proof delivery failed:',error?.message||error);
    return{status:'failed',error:clean(error?.message||'Telegram proof delivery failed')};
  }
}

async function sendReview(type,id,row){
  if(!telegram.isApprovalConfigured())return{status:'not_configured'};
  const claim=await claimReviewMessage(type,id);
  if(!claim.claimed)return{status:'duplicate',messageId:claim.row?.telegram_message_id||null};
  try{
    const sent=await telegram.sendMessage({
      text:renderEntity(type,row),
      replyMarkup:reviewKeyboard(type,id),
    });
    await attachMessage(type,id,sent.message_id);
    const proof=await sendProof(type,id,row,sent.message_id);
    return{status:'sent',messageId:sent.message_id,proofStatus:proof.status,proofMessageId:proof.messageId||null};
  }catch(error){
    await releaseClaim(type,id).catch(()=>{});
    throw error;
  }
}
async function notifyPaymentReview(paymentId){
  const row=await loadPayment(paymentId);
  if(!row)return{status:'not_found'};
  if(row.payment_method!=='manual'||row.status!=='pending'||Number(row.external_amount||0)<=0)return{status:'not_reviewable'};
  if(!clean(row.manual_reference)||!row.has_proof)return{status:'incomplete'};
  return sendReview('payment',row.id,row);
}
async function notifyWalletTopupReview(topupId){
  const row=await loadTopup(topupId);
  if(!row)return{status:'not_found'};
  if(row.payment_method==='gateway'||row.status!=='pending')return{status:'not_reviewable'};
  if(!clean(row.reference)||!row.has_proof)return{status:'incomplete'};
  return sendReview('wallet_topup',row.id,row);
}

function parseCallback(data){
  const match=clean(data).match(/^pr:([pw]):(\d+):(a|r|ca|cr|x)$/);
  if(!match)return null;
  return{type:entityType(match[1]),id:Number(match[2]),action:match[3]};
}
function finalStatus(type,row){
  const status=clean(row?.status).toLowerCase();
  if(type==='payment')return status==='paid'?'approved':status==='rejected'?'rejected':null;
  return status==='approved'?'approved':status==='rejected'?'rejected':null;
}
async function resolveAdmin(query){
  if(String(query?.message?.chat?.id)!==String(telegram.expectedChatId()))return null;
  const configuredThread=telegram.status().messageThreadId;
  if(configuredThread&&Number(query?.message?.message_thread_id||0)!==Number(configuredThread))return null;
  const adminId=telegram.approverAdminId(query?.from?.id);
  if(!adminId)return null;
  return (await pool.query(
    `SELECT id,name,email FROM users WHERE id=$1 AND role='admin' AND is_active=TRUE`,
    [Number(adminId)]
  )).rows[0]||null;
}
async function closeMessage(query,type,id,row,admin,outcome){
  const finalText=[
    renderEntity(type,row),
    '',
    outcome==='approved'?'✅ Reviewed in Telegram':'❌ Reviewed in Telegram',
    'By: '+(admin?.name||admin?.email||'Admin'),
    'Reviewed: '+dateTime(new Date()),
  ].join('\n').slice(0,4096);
  await telegram.editMessageText({
    messageId:query.message.message_id,
    text:finalText,
    replyMarkup:emptyKeyboard(),
  }).catch(async()=>{
    await telegram.editMessageReplyMarkup({messageId:query.message.message_id,replyMarkup:emptyKeyboard()}).catch(()=>{});
  });
}
async function settle(type,id,decision,admin,query){
  if(type==='payment'){
    const status=decision==='approve'?'paid':'rejected';
    await require('./paymentService').updatePaymentStatus(
      id,status,admin.id,
      (decision==='approve'?'Approved':'Rejected')+' from Telegram by '+(admin.name||admin.email||('admin #'+admin.id))+
      ' (Telegram user '+String(query.from.id)+')'
    );
  }else{
    const walletService=require('./walletService');
    if(decision==='approve')await walletService.approveTopup({topupId:id,adminId:admin.id});
    else await walletService.rejectTopup({topupId:id,adminId:admin.id});
  }
}

async function processCallback(query){
  const parsed=parseCallback(query?.data);
  if(!parsed)return{ignored:true,reason:'unsupported_callback'};
  const callbackId=query?.id;
  const admin=await resolveAdmin(query);
  if(!admin){
    await telegram.answerCallbackQuery({
      callbackQueryId:callbackId,
      text:'You are not authorized to review ProPulse payments.',
      showAlert:true,
    }).catch(()=>{});
    return{ignored:true,reason:'unauthorized_approver'};
  }
  const mapped=(await pool.query(
    `SELECT 1 FROM telegram_payment_review_map
      WHERE entity_type=$1 AND entity_id=$2 AND telegram_chat_id=$3 AND telegram_message_id=$4`,
    [parsed.type,parsed.id,String(query.message.chat.id),Number(query.message.message_id)]
  )).rows[0];
  if(!mapped){
    await telegram.answerCallbackQuery({callbackQueryId:callbackId,text:'This is not an active ProPulse payment review message.',showAlert:true}).catch(()=>{});
    return{ignored:true,reason:'unmapped_review_message'};
  }
  const row=await loadEntity(parsed.type,parsed.id);
  if(!row){
    await telegram.answerCallbackQuery({callbackQueryId:callbackId,text:'Payment record was not found.',showAlert:true}).catch(()=>{});
    return{accepted:true,notFound:true};
  }
  const existingOutcome=finalStatus(parsed.type,row);
  if(existingOutcome){
    await setReviewStatus(parsed.type,parsed.id,existingOutcome);
    await closeMessage(query,parsed.type,parsed.id,row,admin,existingOutcome);
    await telegram.answerCallbackQuery({callbackQueryId:callbackId,text:'This payment was already reviewed.'}).catch(()=>{});
    return{accepted:true,alreadyReviewed:true,status:existingOutcome};
  }
  if(parsed.action==='a'||parsed.action==='r'){
    await telegram.editMessageReplyMarkup({
      messageId:query.message.message_id,
      replyMarkup:confirmKeyboard(parsed.type,parsed.id,parsed.action==='a'?'approve':'reject'),
    });
    await telegram.answerCallbackQuery({
      callbackQueryId:callbackId,
      text:parsed.action==='a'?'Confirm approval to continue.':'Confirm rejection to continue.',
    }).catch(()=>{});
    return{accepted:true,confirmationRequired:true};
  }
  if(parsed.action==='x'){
    await telegram.editMessageReplyMarkup({
      messageId:query.message.message_id,
      replyMarkup:reviewKeyboard(parsed.type,parsed.id),
    });
    await telegram.answerCallbackQuery({callbackQueryId:callbackId,text:'Review cancelled.'}).catch(()=>{});
    return{accepted:true,cancelled:true};
  }

  const decision=parsed.action==='ca'?'approve':'reject';
  try{
    await settle(parsed.type,parsed.id,decision,admin,query);
  }catch(error){
    if(['PAYMENT_ALREADY_PAID','PAYMENT_TERMINAL','ALREADY_REVIEWED','NOT_FOUND'].includes(error?.code)){
      const latest=await loadEntity(parsed.type,parsed.id);
      const latestOutcome=finalStatus(parsed.type,latest);
      if(latestOutcome){
        await setReviewStatus(parsed.type,parsed.id,latestOutcome);
        await closeMessage(query,parsed.type,parsed.id,latest,admin,latestOutcome);
        await telegram.answerCallbackQuery({callbackQueryId:callbackId,text:'This payment was already reviewed.'}).catch(()=>{});
        return{accepted:true,alreadyReviewed:true,status:latestOutcome};
      }
    }
    if(['PAYMENT_PROOF_REQUIRED','PAYMENT_NOT_MANUAL','GATEWAY_MANAGED_TOPUP','INVALID_PAYMENT_TRANSITION'].includes(error?.code)){
      await telegram.answerCallbackQuery({callbackQueryId:callbackId,text:error.message||'This payment cannot be reviewed here.',showAlert:true}).catch(()=>{});
      return{accepted:true,rejectedAction:true,code:error.code};
    }
    throw error;
  }

  const latest=await loadEntity(parsed.type,parsed.id);
  const outcome=decision==='approve'?'approved':'rejected';
  await setReviewStatus(parsed.type,parsed.id,outcome);
  await closeMessage(query,parsed.type,parsed.id,latest||row,admin,outcome);
  await telegram.answerCallbackQuery({
    callbackQueryId:callbackId,
    text:decision==='approve'?'Payment approved.':'Payment rejected.',
  }).catch(()=>{});
  return{accepted:true,status:outcome,entityType:parsed.type,entityId:parsed.id,adminId:Number(admin.id)};
}

module.exports={
  notifyPaymentReview,notifyWalletTopupReview,processCallback,
  parseCallback,reviewKeyboard,confirmKeyboard,
};
