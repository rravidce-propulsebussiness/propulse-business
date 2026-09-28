require('dotenv').config();
const bcrypt=require('bcryptjs');
const pool=require('../src/config/database');

const PASSWORD='E2ePass123!';
const accounts={
  admin:{name:'E2E Admin',email:'e2e-admin@propulse.test',role:'admin'},
  business:{name:'E2E Business',email:'e2e-business@propulse.test',role:'business'},
  partner:{name:'E2E Lead Partner',email:'e2e-partner@propulse.test',role:'lead_partner'}
};

async function upsertUser(client,{name,email,role},passwordHash){
  return (await client.query(
    `INSERT INTO users(name,email,password_hash,role,is_active)
     VALUES($1,$2,$3,$4,TRUE)
     ON CONFLICT(email) DO UPDATE
       SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,role=EXCLUDED.role,is_active=TRUE,updated_at=CURRENT_TIMESTAMP
     RETURNING id,name,email,role`,
    [name,email,passwordHash,role]
  )).rows[0];
}

async function ensureBusinessProfile(client,user,catalog){
  const profile=(await client.query(
    `INSERT INTO business_profiles(user_id,phone,business_name,business_details)
     VALUES($1,$2,$3,$4)
     ON CONFLICT(user_id) DO UPDATE
       SET phone=EXCLUDED.phone,business_name=EXCLUDED.business_name,business_details=EXCLUDED.business_details,updated_at=CURRENT_TIMESTAMP
     RETURNING id`,
    [user.id,'9000000000',user.role==='lead_partner'?'E2E Partner Business':'E2E Customer Business','Automated release verification account']
  )).rows[0];
  await client.query(
    `INSERT INTO business_profile_services(business_profile_id,industry_id,service_id,subservice_id,is_active)
     SELECT $1,$2,$3,NULL,TRUE
     WHERE NOT EXISTS(
       SELECT 1 FROM business_profile_services
       WHERE business_profile_id=$1 AND industry_id=$2 AND service_id=$3 AND subservice_id IS NULL
     )`,
    [profile.id,catalog.industry_id,catalog.service_id]
  );
  await client.query(
    `INSERT INTO business_profile_locations(business_profile_id,state_id,city_id,is_active)
     VALUES($1,$2,$3,TRUE)
     ON CONFLICT(business_profile_id,state_id,city_id) DO UPDATE SET is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,
    [profile.id,catalog.state_id,catalog.city_id]
  );
  return profile;
}

async function seed(){
  if(String(process.env.E2E_SEED||'').toLowerCase()!=='true')throw new Error('E2E_SEED=true is required to run this script');
  if(String(process.env.NODE_ENV||'').toLowerCase()==='production')throw new Error('Refusing to seed E2E accounts in production');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const catalog=(await client.query(
      `SELECT i.id industry_id,s.id service_id,st.id state_id,c.id city_id
       FROM industries i
       JOIN services s ON s.industry_id=i.id AND s.is_active=TRUE
       CROSS JOIN LATERAL (
         SELECT st0.id FROM states st0 WHERE st0.is_active=TRUE ORDER BY st0.id LIMIT 1
       ) st
       JOIN LATERAL (
         SELECT c0.id FROM cities c0 WHERE c0.state_id=st.id AND c0.is_active=TRUE ORDER BY c0.id LIMIT 1
       ) c ON TRUE
       WHERE i.is_active=TRUE
       ORDER BY i.id,s.id
       LIMIT 1`
    )).rows[0];
    if(!catalog)throw new Error('E2E catalog requires at least one active Industry/Service and City');

    const passwordHash=await bcrypt.hash(PASSWORD,10);
    const admin=await upsertUser(client,accounts.admin,passwordHash);
    const business=await upsertUser(client,accounts.business,passwordHash);
    const partner=await upsertUser(client,accounts.partner,passwordHash);

    await ensureBusinessProfile(client,business,catalog);
    await ensureBusinessProfile(client,partner,catalog);
    await client.query(
      `INSERT INTO lead_partners(user_id,status,quality_score)
       VALUES($1,'active',100)
       ON CONFLICT(user_id) DO UPDATE SET status='active',quality_score=100,updated_at=CURRENT_TIMESTAMP`,
      [partner.id]
    );

    const leadFixtures=[
      {requirement:'E2E Financial Wallet Purchase',phone:'9000000101',email:'e2e-wallet-lead@propulse.test',price:500},
      {requirement:'E2E Financial Manual Approval',phone:'9000000102',email:'e2e-manual-lead@propulse.test',price:300}
    ];
    const seededLeads=[];
    for(const fixture of leadFixtures){
      const existing=(await client.query(
        `SELECT id FROM leads WHERE source='e2e_release' AND customer_email=$1 ORDER BY id DESC LIMIT 1`,
        [fixture.email]
      )).rows[0];
      const pricing={shares:[{shares:1,normal:fixture.price,pro:fixture.price}]};
      const customFields={buyerCapacity:1,e2eFixture:true};
      let lead;
      if(existing){
        lead=(await client.query(
          `UPDATE leads
              SET industry_id=$1,service_id=$2,state_id=$3,city_id=$4,
                  customer_name='E2E Financial Fixture',customer_phone=$5,
                  requirement=$6,property_type='Office',budget='E2E',
                  status='available',created_by=$7,lead_type='basic',
                  is_exclusive=FALSE,buyer_capacity=1,custom_fields=$8::jsonb,
                  pricing=$9::jsonb,access_strategy='permanent_single',
                  release_to_two_after_hours=NULL,release_to_three_after_hours=NULL,
                  access_capacity_locked=NULL,updated_at=CURRENT_TIMESTAMP
            WHERE id=$10
            RETURNING id`,
          [catalog.industry_id,catalog.service_id,catalog.state_id,catalog.city_id,fixture.phone,fixture.requirement,admin.id,JSON.stringify(customFields),JSON.stringify(pricing),existing.id]
        )).rows[0];
      }else{
        lead=(await client.query(
          `INSERT INTO leads(
             industry_id,service_id,state_id,city_id,customer_name,customer_phone,customer_email,
             requirement,property_type,budget,source,status,created_by,lead_type,is_exclusive,
             buyer_capacity,custom_fields,pricing,access_strategy,release_to_two_after_hours,release_to_three_after_hours
           ) VALUES(
             $1,$2,$3,$4,'E2E Financial Fixture',$5,$6,$7,'Office','E2E','e2e_release','available',$8,
             'basic',FALSE,1,$9::jsonb,$10::jsonb,'permanent_single',NULL,NULL
           ) RETURNING id`,
          [catalog.industry_id,catalog.service_id,catalog.state_id,catalog.city_id,fixture.phone,fixture.email,fixture.requirement,admin.id,JSON.stringify(customFields),JSON.stringify(pricing)]
        )).rows[0];
      }
      seededLeads.push({id:Number(lead.id),requirement:fixture.requirement,price:fixture.price});
    }

    const wallet=(await client.query(
      `INSERT INTO wallets(user_id,balance) VALUES($1,2500)
       ON CONFLICT(user_id) DO UPDATE SET balance=2500,updated_at=CURRENT_TIMESTAMP
       RETURNING id`,
      [business.id]
    )).rows[0];
    await client.query(`DELETE FROM wallet_transactions WHERE user_id=$1 AND reference_type='e2e_seed'`,[business.id]);
    await client.query(
      `INSERT INTO wallet_transactions(wallet_id,user_id,type,amount,balance_after,reference_type,description,status)
       VALUES($1,$2,'credit',2500,2500,'e2e_seed','E2E seeded wallet balance','completed')`,
      [wallet.id,business.id]
    );

    await client.query('COMMIT');
    console.log(JSON.stringify({
      password:PASSWORD,
      accounts:{admin:admin.email,business:business.email,partner:partner.email},
      leads:seededLeads
    }));
  }catch(error){
    await client.query('ROLLBACK');
    throw error;
  }finally{
    client.release();
    await pool.end();
  }
}

seed().catch(error=>{console.error('E2E seed failed:',error);process.exitCode=1});
