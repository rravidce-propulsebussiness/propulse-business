const authService=require('../services/authService');

async function optionalAuth(req,res,next){
  try{
    const header=req.headers.authorization||'';
    const cookieHeader=String(req.headers.cookie||'');
    const cookieToken=cookieHeader.split(';').map(part=>part.trim()).find(part=>part.startsWith('propulse_auth='))?.slice('propulse_auth='.length);
    const decodedCookieToken=cookieToken?decodeURIComponent(cookieToken):null;
    const token=header.startsWith('Bearer ')?header.slice(7):decodedCookieToken;
    if(token){
      const tokenUser=authService.verifyToken(token);
      const currentUser=await authService.getAuthenticatedUser(tokenUser.id,tokenUser.auth_version);
      if(currentUser)req.user=currentUser;
    }
  }catch(error){
    req.user=undefined;
  }
  return next();
}

module.exports=optionalAuth;
