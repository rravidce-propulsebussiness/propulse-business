const pool=require('../config/database');

async function assertInvestorLink({investorUserId,industryId}){
  if(investorUserId===undefined||investorUserId===null||investorUserId==='')return;
  const result=await pool.query("SELECT 1 FROM investments WHERE user_id=$1 AND industry_id=$2 AND status='active' AND starts_at<=CURRENT_TIMESTAMP AND matures_at>CURRENT_TIMESTAMP LIMIT 1",[Number(investorUserId),industryId]);
  if(!result.rows.length)throw new Error('Selected investor has no active investment in this industry');
}

async function setInvestorLink(leadId,investorUserId){
  return (await pool.query('UPDATE leads SET investor_user_id=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',[investorUserId===''||investorUserId===null||investorUserId===undefined?null:Number(investorUserId),leadId])).rows[0]||null;
}

async function getInvestors(){
  return (await pool.query("SELECT u.id,u.name,u.email,COUNT(i.id)::int AS active_investments FROM users u JOIN investments i ON i.user_id=u.id WHERE u.is_active=TRUE AND i.status='active' AND i.starts_at<=CURRENT_TIMESTAMP AND i.matures_at>CURRENT_TIMESTAMP GROUP BY u.id,u.name,u.email ORDER BY u.name ASC,u.email ASC")).rows;
}

module.exports={assertInvestorLink,setInvestorLink,getInvestors};
