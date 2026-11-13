// Regression: reusing one placeholder as SET status=$n and in CASE WHEN $n='x' makes PostgreSQL
// fail with "inconsistent types deduced for parameter $n" (support chat resolve and
// professional quotation updates always returned 500). The placeholder must be cast.
const fs=require('fs');
const path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,'..','src','services',f),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
assert(read('supportChatService.js').includes("SET status=$1::varchar,resolved_at=CASE WHEN $1::varchar='resolved'"),'Support chat status update must cast $1');
assert(read('professionalProjectQuoteService.js').includes("SET status=$3::varchar")&&read('professionalProjectQuoteService.js').includes("CASE WHEN $3::varchar='quoted'"),'Professional quote status update must cast $3');
const callbacks=read('projectCallbackService.js');
assert(callbacks.includes("WHERE project_id=$1::int AND customer_phone=$4::varchar")&&callbacks.includes("SELECT $1::int,$7::varchar,$2::int"),'Project callback insert must cast reused parameters');
assert(callbacks.includes("SELECT NULL,$1::varchar,$2::int")&&callbacks.includes("business_user_id=$2::int AND customer_phone=$4::varchar"),'Profile callback insert must cast reused parameters');
// make_interval named arguments use =>; "days=$1" is parsed as a comparison with a non-existent column.
const servicesDir=path.join(__dirname,'..','src','services');
for(const file of fs.readdirSync(servicesDir).filter(f=>f.endsWith('.js'))){
  const src=fs.readFileSync(path.join(servicesDir,file),'utf8');
  assert(!/make_interval\((days|hours|mins|secs|weeks|months|years)\s*=\s*[^>\s]/.test(src),`${file}: make_interval named argument must use =>`);
}
console.log('SQL status parameter type regression test passed.');
