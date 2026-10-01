const publicExpertService=require('../services/publicExpertService');

async function list(req,res){
  try{return res.json(await publicExpertService.listPublicExperts(req.query||{}));}
  catch(error){console.error('List public experts failed:',error);return res.status(500).json({error:'Failed to load subscribed professionals'});}
}

async function projectVideos(req,res){
  try{return res.json(await publicExpertService.listRecentProjectVideos(req.query||{}));}
  catch(error){console.error('List recent project videos failed:',error);return res.status(500).json({error:'Failed to load recent project videos'});}
}

async function get(req,res){
  try{
    const value=await publicExpertService.getPublicExpert(req.params.expertId);
    if(!value)return res.status(404).json({error:'Business profile not found'});
    return res.json(value);
  }catch(error){console.error('Get public expert failed:',error);return res.status(500).json({error:'Failed to load business profile'});}
}

module.exports={list,projectVideos,get};