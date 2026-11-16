'use strict';
const pool = require('../config/database');
const graph = require('./metaGraphClient');
const DEFAULTS = Object.freeze({ enabled: true, nonMemberMarkupPercent: 28, memberMarkupPercent: 28, twoSharePercent: 60, threeSharePercent: 45 });

async function getSettings() {
 const result=await pool.query('SELECT enabled,non_member_markup_percent,member_markup_percent,two_share_percent,three_share_percent FROM meta_ad_pricing_settings WHERE id=1');
 const row=result.rows[0]; if(!row)return {...DEFAULTS};
 return {enabled:row.enabled===true,nonMemberMarkupPercent:Number(row.non_member_markup_percent),memberMarkupPercent:Number(row.member_markup_percent),twoSharePercent:Number(row.two_share_percent ?? DEFAULTS.twoSharePercent),threeSharePercent:Number(row.three_share_percent ?? DEFAULTS.threeSharePercent)};
}

function withSharePricing(pricing, settings=DEFAULTS) {
 const price=(base, percent)=> {
  const amount=Number(base)||0;
  if(amount<=0)return 0;
  return Math.max(1,Math.round(amount*Number(percent||0)/100));
 };
 return {...pricing,
  nonMemberTwoSharePrice:price(pricing.nonMemberPrice,settings.twoSharePercent),
  memberTwoSharePrice:price(pricing.memberPrice,settings.twoSharePercent),
  nonMemberThreeSharePrice:price(pricing.nonMemberPrice,settings.threeSharePercent),
  memberThreeSharePrice:price(pricing.memberPrice,settings.threeSharePercent),
 };
}

async function updateSettings(input={}) {
 const enabled=input.enabled===true, nonMember=Number(input.nonMemberMarkupPercent), member=Number(input.memberMarkupPercent);
 const two=Number(input.twoSharePercent ?? DEFAULTS.twoSharePercent), three=Number(input.threeSharePercent ?? DEFAULTS.threeSharePercent);
 if(!Number.isFinite(nonMember)||nonMember<0||nonMember>500||!Number.isFinite(member)||member<0||member>500) throw Object.assign(new Error('Markup must be between 0 and 500 percent'),{code:'INVALID_META_AD_PRICING_SETTINGS'});
 if(!Number.isFinite(two)||two<0||two>100||!Number.isFinite(three)||three<0||three>100) throw Object.assign(new Error('Share pricing must be between 0 and 100 percent'),{code:'INVALID_META_AD_PRICING_SETTINGS'});
 const result=await pool.query('INSERT INTO meta_ad_pricing_settings(id,enabled,non_member_markup_percent,member_markup_percent,two_share_percent,three_share_percent,updated_at) VALUES(1,$1,$2,$3,$4,$5,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET enabled=EXCLUDED.enabled,non_member_markup_percent=EXCLUDED.non_member_markup_percent,member_markup_percent=EXCLUDED.member_markup_percent,two_share_percent=EXCLUDED.two_share_percent,three_share_percent=EXCLUDED.three_share_percent,updated_at=CURRENT_TIMESTAMP RETURNING enabled,non_member_markup_percent,member_markup_percent,two_share_percent,three_share_percent',[enabled,nonMember,member,two,three]);
 const row=result.rows[0]; return {enabled:row.enabled===true,nonMemberMarkupPercent:Number(row.non_member_markup_percent),memberMarkupPercent:Number(row.member_markup_percent),twoSharePercent:Number(row.two_share_percent),threeSharePercent:Number(row.three_share_percent)};
}

async function priceLead({adId,userTokenEncrypted}) {
 const settings=await getSettings(); if(!settings.enabled)return {pricing:null,error:null};
 const id=String(adId||'').trim(); if(!/^\d{5,30}$/.test(id))return {pricing:null,error:'Meta did not provide an ad ID for this lead'};
 try {
  const token=graph.decryptToken(userTokenEncrypted);
  const ad=await graph.graphRequest(id,{params:{fields:'account_id'},token});
  if(!/^\d{5,30}$/.test(String(ad.account_id||'')))throw new Error('Meta ad account could not be identified');
  const account=await graph.graphRequest('act_'+ad.account_id,{params:{fields:'currency'},token});
  if(String(account.currency||'').toUpperCase()!=='INR')throw new Error('Meta ad account currency must be INR to calculate lead prices in rupees');
  const insights=await graph.graphRequest(id+'/insights',{params:{fields:'spend',date_preset:'maximum',limit:1},token});
  const totalSpend=Number(insights.data?.[0]?.spend||0); if(!Number.isFinite(totalSpend)||totalSpend<0)throw new Error('Meta returned an invalid cumulative spend total');
  const client=await pool.connect(); let previousSpend;
  try {
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['meta-ad-spend:'+id]);
   const previous=await client.query('SELECT total_spend FROM meta_ad_spend_snapshots WHERE ad_id=$1 FOR UPDATE',[id]);
   previousSpend=Number(previous.rows[0]?.total_spend||0);
   const spendDelta=Math.max(0,totalSpend-previousSpend);
   await client.query('INSERT INTO meta_ad_spend_snapshots(ad_id,ad_account_id,currency,total_spend,last_delta,observed_at) VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP) ON CONFLICT(ad_id) DO UPDATE SET ad_account_id=EXCLUDED.ad_account_id,currency=EXCLUDED.currency,total_spend=EXCLUDED.total_spend,last_delta=EXCLUDED.last_delta,observed_at=CURRENT_TIMESTAMP',[id,String(ad.account_id),'INR',totalSpend,spendDelta]);
   await client.query('COMMIT');
   const round=value=>Math.round(value*100)/100;
   return {pricing:withSharePricing({adId:id,adAccountId:String(ad.account_id),currency:'INR',totalSpend:round(totalSpend),previousSpend:round(previousSpend),spendDelta:round(spendDelta),nonMemberPrice:Math.round(spendDelta*(1+settings.nonMemberMarkupPercent/100)),memberPrice:Math.round(spendDelta*(1+settings.memberMarkupPercent/100))},settings),error:null};
  } catch(error) {await client.query('ROLLBACK').catch(()=>{});throw error;} finally {client.release();}
 } catch(error) {return {pricing:null,error:String(error.message||'Meta ad spend could not be read').slice(0,500)};}
}
module.exports={getSettings,updateSettings,priceLead,withSharePricing,DEFAULTS};
