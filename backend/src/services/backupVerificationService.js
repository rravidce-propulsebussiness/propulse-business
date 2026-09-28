const pool=require('../config/database');

function safeNumber(value){const n=Number(value);return Number.isFinite(n)?n:0}
function normalize(row,maxAgeHours){
  if(!row)return{status:'not_run',lastVerifiedAt:null,ageHours:null,artifactName:null,sizeBytes:null};
  const ageHours=Number(row.age_hours);
  const failed=row.status==='failed';
  const stale=!failed&&Number.isFinite(ageHours)&&ageHours>maxAgeHours;
  return{
    status:failed?'failed':stale?'stale':'verified',
    lastVerifiedAt:row.completed_at||null,
    ageHours:Number.isFinite(ageHours)?Number(ageHours.toFixed(1)):null,
    artifactName:row.artifact_name||null,
    sizeBytes:row.artifact_size_bytes==null?null:Number(row.artifact_size_bytes),
    error:row.error_message||null
  };
}
async function latestFor(type){
  return (await pool.query(
    `SELECT id,status,artifact_name,artifact_size_bytes,error_message,completed_at,
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-completed_at))/3600.0 AS age_hours
       FROM backup_verification_runs
      WHERE backup_type=$1
      ORDER BY completed_at DESC,id DESC
      LIMIT 1`,
    [type]
  )).rows[0]||null;
}
async function getHealthSummary({maxAgeHours=30,required=false}={}){
  const safeAge=Math.min(720,Math.max(1,Number(maxAgeHours)||30));
  const [databaseRow,storageRow]=await Promise.all([latestFor('database'),latestFor('private_storage')]);
  const database=normalize(databaseRow,safeAge);
  const privateStorage=normalize(storageRow,safeAge);
  const states=[database.status,privateStorage.status];
  let status='healthy';
  if(states.includes('failed'))status='failed';
  else if(states.includes('stale'))status='stale';
  else if(states.includes('not_run'))status='not_run';
  return{
    status,
    required:Boolean(required),
    maxAgeHours:safeAge,
    database,
    privateStorage,
    verifiedCount:states.filter(value=>value==='verified').length
  };
}

module.exports={getHealthSummary};
