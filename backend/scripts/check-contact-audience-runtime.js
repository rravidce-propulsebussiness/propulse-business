const assert=require('node:assert/strict');
const pool=require('../src/config/database');
const contactService=require('../src/services/contactService');

async function main(){
  const seeded=(await pool.query(
    "SELECT audience,company_name,email,phone FROM contact_audience_settings WHERE audience=ANY($1::text[]) ORDER BY audience",
    [['website','users','professionals','lead_partners','common']]
  )).rows;
  assert.deepStrictEqual(seeded.map(row=>row.audience),['common','lead_partners','professionals','users','website'],'All contact audiences must exist after migrations');
  assert(seeded.every(row=>String(row.company_name||'').trim().length>=2),'All contact audiences must have a usable company name');

  await contactService.update({
    company_name:'CI Customer Support',
    email:'customers@example.com',
    website_url:'/contact',
  },'users');
  const customerBefore=await contactService.get('users');

  await contactService.update({
    company_name:'CI Professional Support',
    email:'professionals@example.com',
    website_url:'/professional-contact',
  },'professionals');

  const professional=await contactService.get('professionals');
  const customerAfter=await contactService.get('users');

  assert.equal(professional.company_name,'CI Professional Support');
  assert.equal(professional.email,'professionals@example.com');
  assert.equal(professional.website_url,'/professional-contact');
  assert.equal(customerAfter.company_name,customerBefore.company_name,'Updating professionals must not overwrite customer contact settings');
  assert.equal(customerAfter.email,customerBefore.email,'Updating professionals must not overwrite customer email settings');
  assert.equal(customerAfter.website_url,customerBefore.website_url,'Updating professionals must not overwrite customer website settings');

  const legacy=(await pool.query("SELECT company_name,email,phone FROM contact_settings WHERE id=1")).rows[0];
  if(legacy){
    await pool.query("DELETE FROM contact_audience_settings WHERE audience='lead_partners'");
    const fallback=await contactService.get('lead_partners');
    assert.equal(fallback.audience,'lead_partners');
    assert.equal(fallback.company_name,legacy.company_name,'Missing audience rows must fall back to legacy contact settings');
    assert.equal(fallback.email,legacy.email,'Legacy fallback must preserve contact email');
    assert.equal(fallback.phone,legacy.phone,'Legacy fallback must preserve contact phone');
  }

  console.log('Contact audience backfill and isolation runtime test passed.');
}

main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>pool.end());
