const operationalMonitoringService=require('../services/operationalMonitoringService');

async function reportClientError(req,res){
  try{
    const message=String(req.body?.message||'').trim();
    if(!message)return res.status(400).json({error:'Error message is required'});
    if(message.length>2000)return res.status(400).json({error:'Error message is too long'});
    const event=await operationalMonitoringService.recordClientError({payload:req.body||{},req});
    return res.status(202).json({accepted:true,eventId:event.id});
  }catch(error){
    console.error(`[${req.requestId||'no-request-id'}] Client observability capture failed:`,error?.message||error);
    return res.status(202).json({accepted:false});
  }
}

module.exports={reportClientError};
