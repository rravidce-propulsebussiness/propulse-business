const svc=require('../services/adminCommercialService');
const investmentSvc=require('../services/adminInvestmentService');
const ledger=require('../services/investorFinancialLedgerService');
const {sendError}=require('../utils/errorResponse');

async function investorSettings(req,res){try{return res.json(await svc.getInvestorSettings())}catch(e){console.error(e);return sendError(res,500,e,'Failed to load investor settings')}}
async function updateInvestor(req,res){try{return res.json(await svc.updateInvestorSettings(req.body))}catch(e){console.error(e);const status=['INVALID_LOCATION_CONFIG','INVALID_INDUSTRY_LOCATION_CONFIG','INVALID_INVESTMENT_CONFIG'].includes(e.code)?400:500;return sendError(res,status,e,'Failed to save investor settings',{code:e.code})}}
async function investmentDashboard(req,res){
  try{
    const dashboard=await investmentSvc.getDashboard({
      search:req.query.search,status:req.query.status,industryId:req.query.industryId,
      page:req.query.page,limit:req.query.limit
    });
    const summaryScopes=dashboard?.summaryScopes||[];
    const summaries=await ledger.getInvestorFinancialSummaries(summaryScopes);
    const baseInvestors=dashboard?.investors||[];
    const investors=baseInvestors.map(investor=>{
      const funds=summaries.get(Number(investor.user_id));
      if(!funds)return investor;
      return{
        ...investor,
        latest_cycle_id:funds.cycleId,
        ledger:{
          available_for_ads:Number(funds.available_for_ads||0),
          ad_spent:Number(funds.ad_spent||0),
          generated:Number((funds.auto_invest_earnings||0)+(funds.non_auto_earnings||0)),
          withdrawable_earnings:Number(funds.withdrawable_earnings||0),
          transferable:Number(funds.transferable||0),
          payout_reserved:Number(funds.payout_reserved||0),
          payout_transferred:Number(funds.payout_transferred||0),
          total_invested:Number(funds.total_invested||0),
        },
        payable_now:Number(funds.transferable||0),
      };
    });
    const portfolio=summaryScopes.reduce((acc,scope)=>{
      const funds=summaries.get(Number(scope.userId));
      if(!funds)return acc;
      acc.capital+=Number(funds.total_invested||0);
      acc.availableForAds+=Number(funds.available_for_ads||0);
      acc.adSpent+=Number(funds.ad_spent||0);
      acc.generated+=Number(funds.auto_invest_earnings||0)+Number(funds.non_auto_earnings||0);
      acc.transferable+=Number(funds.transferable||0);
      acc.reserved+=Number(funds.payout_reserved||0);
      acc.transferred+=Number(funds.payout_transferred||0);
      if(Number(funds.transferable||0)>0)acc.ready+=1;
      return acc;
    },{capital:0,availableForAds:0,adSpent:0,generated:0,transferable:0,reserved:0,transferred:0,ready:0});
    for(const key of ['capital','availableForAds','adSpent','generated','transferable','reserved','transferred'])portfolio[key]=Number(portfolio[key].toFixed(2));
    const {summaryScopes:_summaryScopes,...publicDashboard}=dashboard;
    return res.json({...publicDashboard,investors,portfolio});
  }catch(e){
    console.error(e);
    return sendError(res,500,e,'Failed to load investor analytics');
  }
}
module.exports={investorSettings,updateInvestor,investmentDashboard};
