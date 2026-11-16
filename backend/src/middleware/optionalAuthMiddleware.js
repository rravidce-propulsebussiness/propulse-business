const authService=require('../services/authService');
const supabaseAuthService=require('../services/supabaseAuthService');

// Optional access must resolve the same Propulse and Supabase identities as requireAuth.
// Invalid credentials remain anonymous; they must not break public endpoints.
async function optionalAuth(req,res,next){
  const header=String(req.headers.authorization||'');
  const bearer=header.startsWith('Bearer ')?header.slice(7).trim():'';
  const cookie=String(req.headers.cookie||'').split(';').map(part=>part.trim())
    .find(part=>part.startsWith('propulse_auth='))?.slice('propulse_auth='.length);
  let cookieToken='';
  try{cookieToken=cookie?decodeURIComponent(cookie):''}catch{}
  req.user=null;
  // Explicit bearer credentials take precedence over incidental cookies.
  if(bearer){
    try{
      const tokenUser=authService.verifyToken(bearer);
      const current=await authService.getAuthenticatedUser(tokenUser.id,tokenUser.auth_version);
      if(current){req.user=current;req.authProvider='propulse';return next();}
    }catch{}
    if(supabaseAuthService.isConfigured()){
      try{
        const supabaseUser=await supabaseAuthService.verifyAccessToken(bearer);
        const current=await authService.getAuthenticatedUserBySupabaseId(supabaseUser.id);
        if(current){req.user=current;req.supabaseUser=supabaseUser;req.authProvider='supabase';return next();}
      }catch{}
    }
  }
  if(cookieToken){
    try{
      const tokenUser=authService.verifyToken(cookieToken);
      const current=await authService.getAuthenticatedUser(tokenUser.id,tokenUser.auth_version);
      if(current){req.user=current;req.authProvider='propulse';return next();}
    }catch{}
  }
  return next();
}

module.exports=optionalAuth;
