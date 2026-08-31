require('dotenv').config();
const fs=require('fs');
const path=require('path');
const pool=require('../config/database');

async function main(){
  const files=['leadPurchasesMigration.sql','leadEntitlementsMigration.sql'];
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    for(const file of files){
      const sql=fs.readFileSync(path.join(__dirname,file),'utf8');
      await client.query(sql);
      console.log(`Applied ${file}`);
    }
    await client.query('COMMIT');
    console.log('Lead access migrations complete.');
  }catch(error){
    await client.query('ROLLBACK');
    console.error('Lead access migration failed:',error.message);
    process.exitCode=1;
  }finally{client.release();await pool.end();}
}

main();
