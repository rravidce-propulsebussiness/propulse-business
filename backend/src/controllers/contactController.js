const contactService=require('../services/contactService');
const {sendError}=require('../utils/errorResponse');

function audience(req){return String(req.query?.audience||'website').trim().toLowerCase()}

async function getPublic(req,res){
  try{return res.json(await contactService.get(audience(req)))}
  catch(error){
    const status=error.code==='INVALID_AUDIENCE'?400:500;
    if(status===500)console.error('Get public contact settings failed:',error.message);
    return sendError(res,status,error,'Failed to load contact details',{code:error.code});
  }
}
async function getAdmin(req,res){
  try{return res.json(await contactService.get(audience(req)))}
  catch(error){
    const status=error.code==='INVALID_AUDIENCE'?400:500;
    if(status===500)console.error('Get admin contact settings failed:',error.message);
    return sendError(res,status,error,'Failed to load contact settings',{code:error.code});
  }
}
async function updateAdmin(req,res){
  try{return res.json(await contactService.update(req.body||{},audience(req)))}
  catch(error){
    const status=['INVALID_CONTACT_URL','INVALID_COMPANY','INVALID_AUDIENCE'].includes(error.code)?400:500;
    if(status===500)console.error('Update contact settings failed:',error.message);
    return sendError(res,status,error,'Failed to save contact settings',{code:error.code});
  }
}
module.exports={getPublic,getAdmin,updateAdmin};
