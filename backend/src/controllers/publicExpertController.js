const publicExpertService=require('../services/publicExpertService');

async function list(req,res){
  try{
    return res.json(await publicExpertService.listPublicExperts(req.query||{}));
  }catch(error){
    console.error('List public experts failed:',error);
    return res.status(500).json({error:'Failed to load registered businesses'});
  }
}

module.exports={list};
