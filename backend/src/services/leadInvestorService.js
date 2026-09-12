const pool=require('../config/database');

async function assertInvestorLink({investorUserId,industryId}){
  if(investorUserId===undefined||investorUserId===null||investorUserId==='')return;
  const result=await pool.query("SELECT 1 FROM investments WHERE user_id=$1 AND industry_id=$2 AND status IN ('active','matured') AND COALESCE(starts_at,created_at)<=CURRENT_TIMESTAMP LIMIT 1",[Number(investorUserId),Number(industryId)]);
  if(!result.rows.length)throw Object.assign(new Error('Selected investor has no eligible investment in this industry'),{code:'INVESTOR_INDUSTRY_MISMATCH'});
}

async function setInvestorLink(leadId,investorUserId){
  const lead=(await pool.query('SELECT id,industry_id FROM leads WHERE id=$1',[Number(leadId)])).rows[0];
  if(!lead)throw Object.assign(new Error('Lead not found'),{code:'NOT_FOUND'});
  await assertInvestorLink({investorUserId,industryId:lead.industry_id});
  return (await pool.query('UPDATE leads SET investor_user_id=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',[investorUserId===''||investorUserId===null||investorUserId===undefined?null:Number(investorUserId),leadId])).rows[0]||null;
}

async function getInvestors(){
  return (await pool.query("SELECT DISTINCT u.id,u.name,u.email,COUNT(i.id)::int AS investments_count FROM users u JOIN investments i ON i.user_id=u.id WHERE u.is_active=TRUE AND i.status IN ('active','matured') GROUP BY u.id,u.name,u.email ORDER BY u.name ASC,u.email ASC")).rows;
}

module.exports={assertInvestorLink,setInvestorLink,getInvestors};
