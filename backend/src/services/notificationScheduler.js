const notifications=require('./notificationService');
const jobControl=require('./backgroundJobControlService');

const DELIVERY_INTERVAL_MS=Math.min(15*60*1000,Math.max(30*1000,Number(process.env.NOTIFICATION_DELIVERY_INTERVAL_MS)||60*1000));
const REMINDER_INTERVAL_MS=Math.min(24*60*60*1000,Math.max(60*60*1000,Number(process.env.NOTIFICATION_REMINDER_INTERVAL_MS)||6*60*60*1000));
let deliveryTimer=null,reminderTimer=null,deliveryRunning=false,reminderRunning=false;

async function runNotificationDeliveryCore(){
  if(deliveryRunning)return{busy:true};
  deliveryRunning=true;
  try{return await notifications.processEmailDeliveries({limit:25})}
  catch(error){console.error('Notification email delivery cycle failed:',error?.stack||error);return{failed:true,error:error?.message}}
  finally{deliveryRunning=false}
}
async function runMembershipRemindersCore(){
  if(reminderRunning)return{busy:true};
  reminderRunning=true;
  try{return await notifications.enqueueMembershipExpiryNotifications()}
  catch(error){console.error('Membership notification reminder cycle failed:',error?.stack||error);return{failed:true,error:error?.message}}
  finally{reminderRunning=false}
}
async function runNotificationDelivery({source='scheduled',triggeredBy=null}={}){
  return jobControl.execute({jobKey:'notification_email_delivery',source,triggeredBy,task:runNotificationDeliveryCore});
}
async function runMembershipReminders({source='scheduled',triggeredBy=null}={}){
  return jobControl.execute({jobKey:'membership_expiry_reminders',source,triggeredBy,task:runMembershipRemindersCore});
}
function startNotificationScheduler({unref=true,runImmediately=false}={}){
  if(!deliveryTimer){
    if(runImmediately)void runNotificationDelivery({source:'startup'});
    deliveryTimer=setInterval(()=>{void runNotificationDelivery({source:'scheduled'})},DELIVERY_INTERVAL_MS);
    if(unref)deliveryTimer.unref?.();
  }
  if(!reminderTimer){
    if(runImmediately)void runMembershipReminders({source:'startup'});
    reminderTimer=setInterval(()=>{void runMembershipReminders({source:'scheduled'})},REMINDER_INTERVAL_MS);
    if(unref)reminderTimer.unref?.();
  }
  console.log(`Notification scheduler enabled: email every ${Math.round(DELIVERY_INTERVAL_MS/1000)}s; membership reminders every ${Math.round(REMINDER_INTERVAL_MS/3600000)}h.`);
  return async()=>{
    if(deliveryTimer){clearInterval(deliveryTimer);deliveryTimer=null}
    if(reminderTimer){clearInterval(reminderTimer);reminderTimer=null}
  };
}
module.exports={runNotificationDelivery,runMembershipReminders,runNotificationDeliveryCore,runMembershipRemindersCore,startNotificationScheduler,DELIVERY_INTERVAL_MS,REMINDER_INTERVAL_MS};
