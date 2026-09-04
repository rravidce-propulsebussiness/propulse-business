const authService=require('../services/authService');

function optionalAuth(req,res,next){
  try{
    const header=req.headers.authorization||'';
    if(header.startsWith('Bearer ')) req.user=authService.verifyToken(header.slice(7));
  }catch(error){
    req.user=undefined;
  }
  return next();
}

module.exports=optionalAuth;
