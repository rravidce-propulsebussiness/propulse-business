const contactService=require('../services/contactService');

async function getPublic(req,res){
  try{return res.json(await contactService.get())}
  catch(error){console.error('Get public contact settings failed:',error.message);return res.status(500).json({error:'Failed to load contact details'})}
}
async function getAdmin(req,res){
  try{return res.json(await contactService.get())}
  catch(error){console.error('Get admin contact settings failed:',error.message);return res.status(500).json({error:'Failed to load contact settings'})}
}
async function updateAdmin(req,res){
  try{return res.json(await contactService.update(req.body||{}))}
  catch(error){
    const status=error.code==='INVALID_COMPANY'?400:500;
    return res.status(status).json({error:error.message||'Failed to save contact settings',code:error.code});
  }
}
module.exports={getPublic,getAdmin,updateAdmin};