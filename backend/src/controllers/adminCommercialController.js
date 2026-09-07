const svc=require('../services/adminCommercialService');
async function investorSettings(req,res){try{res.json(await svc.getInvestorSettings())}catch(e){console.error(e);res.status(500).json({error:'Failed to load investor settings'})}}
async function updateInvestor(req,res){try{res.json(await svc.updateInvestorSettings(req.body))}catch(e){console.error(e);const status=['INVALID_LOCATION_CONFIG','INVALID_INDUSTRY_LOCATION_CONFIG','INVALID_INVESTMENT_CONFIG'].includes(e.code)?400:500;res.status(status).json({error:e.message||'Failed to save investor settings',code:e.code})}}
module.exports={investorSettings,updateInvestor};
