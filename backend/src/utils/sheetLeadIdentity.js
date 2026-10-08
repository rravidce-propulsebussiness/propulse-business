// Contact details identify a person, not a project. A Sheet row may update a
// lead by a unique explicit external ID, or by a unique contact+requirement match.
// Ambiguous matches must create/reject rather than overwrite an arbitrary lead.
const clean=value=>String(value??'').trim();
const normalized=value=>clean(value).toLowerCase();
const field=(row,keys)=>{
  const entries=Object.entries(row||{});
  const names=new Set(keys.map(value=>normalized(value).replace(/[^a-z0-9]/g,'')));
  const pair=entries.find(([key,value])=>names.has(normalized(key).replace(/[^a-z0-9]/g,''))&&clean(value));
  return pair?clean(pair[1]):'';
};
const phoneKey=value=>clean(value).replace(/\D/g,'');
const emailKey=value=>normalized(value);
const sourceId=row=>field(row,['id','Lead Id','Lead ID','External Id','External ID']);
const reqKey=row=>normalized(field(row,['Requirement']));
function sheetRowIdentity(row){
  const id=sourceId(row);
  if(id)return 'id:'+id;
  const requirement=reqKey(row);
  if(!requirement)return 'row:'+JSON.stringify(row);
  const phone=phoneKey(field(row,['Customer Phone']));
  const email=emailKey(field(row,['Customer Email']));
  const industry=normalized(field(row,['Industry']));
  const service=normalized(field(row,['Service']));
  const subservice=normalized(field(row,['Subservice']));
  const pin=phoneKey(field(row,['Pincode']));
  // Do not collapse separate household requirements with the same contact.
  return JSON.stringify({phone,email,requirement,industry,service,subservice,pin});
}
function candidateMaps(rows){
  const byId=new Map(),byPhone=new Map(),byEmail=new Map();
  const add=(map,key,lead)=>{if(!key)return;const set=map.get(key)||[];set.push(lead);map.set(key,set);};
  for(const lead of rows||[]){
    const custom=lead.custom_fields&&typeof lead.custom_fields==='object'&&!Array.isArray(lead.custom_fields)?lead.custom_fields:{};
    const id=sourceId(custom);
    add(byId,id,lead);
    add(byPhone,phoneKey(lead.customer_phone),lead);
    add(byEmail,emailKey(lead.customer_email),lead);
  }
  return {byId,byPhone,byEmail};
}
function matchLead(row,maps){
  const id=sourceId(row);
  if(id){
    const candidates=maps.byId.get(id)||[];
    return candidates.length===1?candidates[0]:null;
  }
  const req=reqKey(row);
  // Blank or placeholder requirements cannot establish a unique project.
  if(!req||req==='lead requirement not provided')return null;
  const pin=phoneKey(field(row,['Pincode']));
  const filter=items=>(items||[]).filter(lead=>
    normalized(lead.requirement)===req &&
    (!pin||phoneKey(lead.pincode)===pin)
  );
  const phone=phoneKey(field(row,['Customer Phone']));
  const email=emailKey(field(row,['Customer Email']));
  const phoneMatches=phone?filter(maps.byPhone.get(phone)):[];
  const emailMatches=email?filter(maps.byEmail.get(email)):[];
  let matches;
  if(phoneMatches.length&&emailMatches.length){
    const ids=new Set(emailMatches.map(lead=>String(lead.id)));
    matches=phoneMatches.filter(lead=>ids.has(String(lead.id)));
  }else if(phoneMatches.length){
    matches=phoneMatches;
  }else{
    matches=emailMatches;
  }
  const unique=new Map(matches.map(lead=>[String(lead.id),lead]));
  return unique.size===1?[...unique.values()][0]:null;
}
module.exports={sheetRowIdentity,candidateMaps,matchLead};
