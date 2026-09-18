const homepageMediaService=require('../services/homepageMediaService');

async function getPublic(req,res){
  try{return res.json(await homepageMediaService.get())}
  catch(error){console.error('Get homepage media failed:',error.message);return res.status(500).json({error:'Failed to load homepage media'})}
}
async function getAdmin(req,res){
  try{return res.json(await homepageMediaService.get())}
  catch(error){console.error('Get admin homepage media failed:',error.message);return res.status(500).json({error:'Failed to load homepage media'})}
}
async function upload(req,res){
  try{
    return res.json(await homepageMediaService.replace(req.body?.slot,req.body?.dataUrl))
  }catch(error){
    const bad=['INVALID_SLOT','INVALID_IMAGE','IMAGE_TOO_LARGE'];
    return res.status(bad.includes(error.code)?400:500).json({error:error.message||'Failed to save homepage image',code:error.code});
  }
}
async function remove(req,res){
  try{return res.json(await homepageMediaService.remove(req.params.slot))}
  catch(error){return res.status(error.code==='INVALID_SLOT'?400:500).json({error:error.message||'Failed to remove homepage image',code:error.code})}
}
module.exports={getPublic,getAdmin,upload,remove};