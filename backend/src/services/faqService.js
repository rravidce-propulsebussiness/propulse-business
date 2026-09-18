const pool=require('../config/database');

const CATEGORIES=['general','leads','payments','withdrawals','account','reports'];

function normalizeId(value){
  const id=Number(value);
  if(!Number.isInteger(id)||id<=0){const e=new Error('FAQ ID must be a positive integer');e.code='INVALID_ID';throw e}
  return id;
}
function normalizeInput(body={}){
  const audience=String(body.audience||'lead_partner').trim().toLowerCase();
  const category=String(body.category||'general').trim().toLowerCase();
  const question=String(body.question||'').trim();
  const answer=String(body.answer||'').trim();
  const sortOrder=Number.isFinite(Number(body.sort_order))?Math.trunc(Number(body.sort_order)):0;
  if(audience!=='lead_partner') {const e=new Error('Only Lead Partner FAQs can be edited here');e.code='INVALID_AUDIENCE';throw e}
  if(!CATEGORIES.includes(category)){const e=new Error('Invalid FAQ category');e.code='INVALID_CATEGORY';throw e}
  if(question.length<4){const e=new Error('FAQ question is required');e.code='INVALID_QUESTION';throw e}
  if(answer.length<2){const e=new Error('FAQ answer is required');e.code='INVALID_ANSWER';throw e}
  return {audience,category,question,answer,sort_order:sortOrder,is_active:body.is_active!==false};
}
async function list(audience='lead_partner',includeInactive=false){
  const params=[audience];
  const where=['audience=$1'];
  if(!includeInactive) where.push('is_active=TRUE');
  const result=await pool.query(
    `SELECT id,audience,category,question,answer,sort_order,is_active,created_at,updated_at
     FROM faq_entries WHERE ${where.join(' AND ')}
     ORDER BY category,sort_order,id`,params
  );
  return result.rows;
}
async function adminList(audience='lead_partner'){
  return list(audience,true);
}
async function create(body){
  const input=normalizeInput(body);
  const result=await pool.query(
    `INSERT INTO faq_entries(audience,category,question,answer,sort_order,is_active)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [input.audience,input.category,input.question,input.answer,input.sort_order,input.is_active]
  );
  return result.rows[0];
}
async function update(id,body){
  const faqId=normalizeId(id);
  const input=normalizeInput(body);
  const result=await pool.query(
    `UPDATE faq_entries SET audience=$1,category=$2,question=$3,answer=$4,sort_order=$5,is_active=$6,updated_at=CURRENT_TIMESTAMP
     WHERE id=$7 RETURNING *`,
    [input.audience,input.category,input.question,input.answer,input.sort_order,input.is_active,faqId]
  );
  if(!result.rows[0]){const e=new Error('FAQ not found');e.code='NOT_FOUND';throw e}
  return result.rows[0];
}
async function remove(id){
  const faqId=normalizeId(id);
  const result=await pool.query('DELETE FROM faq_entries WHERE id=$1 RETURNING id',[faqId]);
  if(!result.rows[0]){const e=new Error('FAQ not found');e.code='NOT_FOUND';throw e}
  return {id:faqId};
}
module.exports={CATEGORIES,list,adminList,create,update,remove};