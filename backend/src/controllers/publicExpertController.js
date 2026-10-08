const publicExpertService=require('../services/publicExpertService');
const projectCallbackService=require('../services/projectCallbackService');

async function list(req,res){
  try{return res.json(await publicExpertService.listPublicExperts(req.query||{}));}
  catch(error){console.error('List public experts failed:',error);return res.status(500).json({error:'Failed to load subscribed professionals'});}
}

async function projects(req,res){
  try{return res.json(await publicExpertService.listRecentProjects(req.query||{}));}
  catch(error){console.error('List recent projects failed:',error);return res.status(500).json({error:'Failed to load recent projects'});}
}

async function projectDetail(req,res){
  try{
    const project=await publicExpertService.getPublicProject(req.params.projectId);
    if(!project)return res.status(404).json({error:'Project not found'});
    return res.json(project);
  }catch(error){
    console.error('Get public project failed:',error);
    return res.status(500).json({error:'Unable to load project'});
  }
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

async function requestProjectCallback(req,res){
  try{return res.status(201).json(await projectCallbackService.requestCallback(req.params.projectId,req.body||{}))}
  catch(error){
    const code=String(error.code||'');
    const status=code==='PROJECT_NOT_FOUND'?404:code.startsWith('INVALID_')?400:500;
    if(status===500)console.error('Submit project callback failed:',error.message);
    return res.status(status).json({error:status===500?'Unable to submit callback request':error.message});
  }
}
module.exports={list,projects,projectVideos,get,requestProjectCallback};