const contactService=require('../services/contactService');

function audience(req){return String(req.query?.audience||'website').trim().toLowerCase()}

async function getPublic(req,res){
  try{return res.json(await contactService.get(audience(req)))}
  catch(error){console.error('Get public contact settings failed:',error.message);return res.status(error.code==='INVALID_AUDIENCE'?400:500).json({error:error.message||'Failed to load contact details',code:error.code})}
}
async function getAdmin(req,res){
  try{return res.json(await contactService.get(audience(req)))}
  catch(error){console.error('Get admin contact settings failed:',error.message);return res.status(error.code==='INVALID_AUDIENCE'?400:500).json({error:error.message||'Failed to load contact settings',code:error.code})}
}
async function updateAdmin(req,res){
  try{return res.json(await contactService.update(req.body||{},audience(req)))}
  catch(error){
    const status=error.code==='INVALID_CONTACT_URL'||error.code==='INVALID_COMPANY'||error.code==='INVALID_AUDIENCE'?400:500;
    return res.status(status).json({error:error.message||'Failed to save contact settings',code:error.code});
  }
}
module.exports={getPublic,getAdmin,updateAdmin};
