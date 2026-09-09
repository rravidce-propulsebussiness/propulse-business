const leadPurchaseService=require('../services/leadPurchaseCouponService');
const leadCrmPurchaseService=require('../services/leadCrmPurchaseService');
const {buildXlsx}=require('../services/leadExcelService');
const mapError=(error)=>{const map={INVALID_SHARES:400,INVALID_PRICE:400,INVALID_AMOUNT:400,INVALID_PURCHASE:400,INVALID_REFERENCE:400,REFERENCE_REQUIRED:400,PAYMENT_SUBMISSION_REQUIRED:400,DUPLICATE_REFERENCE:409,PRO_REQUIRED:403,PROFILE_MISMATCH:403,NOT_FOUND:404,NOT_AVAILABLE:409,CAPACITY_REACHED:409,PAYMENT_PENDING:409,ALREADY_PURCHASED:409,INSUFFICIENT_BALANCE:402};return map[error.code]||500};
async function purchase(req,res){try{const manualReference=String(req.body.manualReference||'').trim();const proofUrl=String(req.body.proofUrl||'').trim();if(!manualReference||!proofUrl)return res.status(400).json({error:'Payment reference / UTR and payment proof are required before payment can be processed',code:'PAYMENT_SUBMISSION_REQUIRED'});return res.status(201).json(await leadPurchaseService.submitLeadPurchase({leadId:req.params.id,userId:req.user.id,shares:req.body.shares,useWallet:req.body.useWallet!==false,couponCode:req.body.couponCode,manualReference,proofUrl}))}catch(error){console.error('Lead purchase failed',{leadId:req.params.id,userId:req.user?.id,code:error?.code,message:error?.message,stack:error?.stack});return res.status(mapError(error)).json({error:error.message||'Failed to purchase lead',code:error.code||'LEAD_PURCHASE_FAILED'})}}
async function quote(req,res){try{return res.json(await leadPurchaseService.quoteLead({leadId:req.params.id,userId:req.user.id,shares:req.body.shares,useWallet:req.body.useWallet!==false,couponCode:req.body.couponCode}))}catch(error){console.error('Lead quote failed',{leadId:req.params.id,userId:req.user?.id,code:error?.code,message:error?.message});return res.status(mapError(error)).json({error:error.message||'Unable to calculate lead price',code:error.code||'LEAD_QUOTE_FAILED'})}}
async function submit(req,res){try{const manualReference=String(req.body.manualReference||'').trim();const proofUrl=String(req.body.proofUrl||'').trim();return res.status(201).json(await leadPurchaseService.submitLeadPurchase({leadId:req.params.id,userId:req.user.id,shares:req.body.shares,useWallet:req.body.useWallet!==false,couponCode:req.body.couponCode,manualReference,proofUrl}))}catch(error){console.error('Lead payment submission failed',{leadId:req.params.id,userId:req.user?.id,code:error?.code,message:error?.message});return res.status(mapError(error)).json({error:error.message||'Unable to submit lead payment',code:error.code||'LEAD_PAYMENT_SUBMISSION_FAILED'})}}
async function purchases(req,res){try{return res.json(await leadCrmPurchaseService.getPurchases(req.user.id))}catch(error){console.error('Failed to fetch purchased leads',{userId:req.user?.id,code:error?.code,message:error?.message,stack:error?.stack});return res.status(500).json({error:'Failed to fetch purchased leads'})}}
async function exportPurchases(req,res){try{
  const month=String(req.query.month||'').trim();
  let from=String(req.query.from||'').trim(); let to=String(req.query.to||'').trim();
  if(month){
    if(!/^\d{4}-\d{2}$/.test(month))return res.status(400).json({error:'Month must be YYYY-MM'});
    from=`${month}-01`;
    const [year,m]=month.split('-').map(Number); const next=new Date(Date.UTC(year,m,1));
    to=next.toISOString().slice(0,10);
  }
  if(from&&!/^\d{4}-\d{2}-\d{2}$/.test(from))return res.status(400).json({error:'From date must be YYYY-MM-DD'});
  if(to&&!/^\d{4}-\d{2}-\d{2}$/.test(to))return res.status(400).json({error:'To date must be YYYY-MM-DD'});
  const rows=await leadCrmPurchaseService.getExportPurchases(req.user.id,{from,to});
  const baseHeaders=['Lead ID','Customer Name','Phone','Email','Industry','Service','Subservice','Requirement','Property Type','Budget','State','City','Source','Access Type','Shares','Lead Date','Status','Remarks','Last Followed Up','Next Follow-up','Follow-up Count','Contacted By','Notes'];
  const customKeys=[...new Set(rows.flatMap(r=>Object.keys(r.custom_fields&&typeof r.custom_fields==='object'&&!Array.isArray(r.custom_fields)?r.custom_fields:{})))].filter(k=>!/(pricing|price|buyer.?capacity|normal|pro)/i.test(k));
  const headers=[...baseHeaders,...customKeys.map(k=>`Custom: ${String(k)}`)];
  const values=rows.map(r=>{const custom=r.custom_fields&&typeof r.custom_fields==='object'&&!Array.isArray(r.custom_fields)?r.custom_fields:{};return [r.lead_id,r.customer_name,r.customer_phone,r.customer_email,r.industry_name,r.service_name,r.subservice_name,r.requirement,r.property_type,r.budget,r.state_name,r.city_name,r.source,r.access_type,r.shares,r.access_date,r.crm_status||'new',r.crm_remarks,r.last_followed_up_at,r.next_followup_at,r.followup_count,r.contacted_by_name,r.notes,...customKeys.map(k=>custom[k]??'')]});
  const workbook=buildXlsx(headers,values,'My Leads');
  const suffix=month||from||'all';
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition',`attachment; filename="propulse-my-leads-${suffix}.xlsx"`);
  return res.send(workbook);
}catch(error){console.error('Failed to export purchased leads',{userId:req.user?.id,code:error?.code,message:error?.message});return res.status(500).json({error:'Failed to export leads'})}}
module.exports={purchase,quote,submit,purchases,exportPurchases};
