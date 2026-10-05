const assert=require('node:assert/strict');
const pool=require('../src/config/database');
const contactService=require('../src/services/contactService');

async function main(){
  const audiences=(await pool.query(
    "SELECT audience,company_name FROM contact_audience_settings WHERE audience=ANY($1::text[]) ORDER BY audience",
    [['users','professionals']]
  )).rows;
  assert(audiences.some(row=>row.audience==='users'),'Customer contact audience must exist');
  assert(audiences.some(row=>row.audience==='professionals'),'Professional contact audience must exist after migration');

  const customerBefore=await contactService.get('users');
  await contactService.update({
    company_name:'CI Professional Support',
    email:'professionals@example.com',
    website_url:'/professional-contact',
  },'professionals');
  const professional=await contactService.get('professionals');
  const customerAfter=await contactService.get('users');

  assert.equal(professional.company_name,'CI Professional Support');
  assert.equal(professional.website_url,'/professional-contact');
  assert.equal(customerAfter.company_name,customerBefore.company_name,'Updating professionals must not overwrite customer contact settings');
  assert.equal(customerAfter.email,customerBefore.email,'Updating professionals must not overwrite customer email settings');

  console.log('Professional contact audience runtime test passed.');
}

main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>pool.end());
