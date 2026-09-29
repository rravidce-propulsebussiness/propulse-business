const funnelEventService=require('../services/customerFunnelEventService');

async function record(req,res){
  try{
    const result=await funnelEventService.recordEvent(req.body||{});
    return res.status(result.duplicate?200:201).json(result);
  }catch(error){
    if(error?.status)return res.status(error.status).json({error:error.message,code:error.code});
    console.error('Customer funnel event capture failed:',error);
    return res.status(500).json({error:'Failed to record funnel event'});
  }
}

module.exports={record};
