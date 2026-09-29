const customerFunnelAnalyticsService = require('../services/customerFunnelAnalyticsService');

async function get(req,res){
  try{
    return res.json(await customerFunnelAnalyticsService.getCustomerFunnelAnalytics(req.query||{}));
  }catch(error){
    console.error('Customer funnel analytics failed:',error);
    return res.status(500).json({error:'Failed to load customer funnel analytics'});
  }
}

module.exports={get};
