const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const login=read('frontend/src/pages/Login.jsx');
const signup=read('frontend/src/pages/Signup.jsx');
const loginCss=read('frontend/src/pages/Login.css');
const signupCss=read('frontend/src/pages/Signup.css');
const app=read('frontend/src/App.jsx');
const soundEffects=read('frontend/src/utils/soundEffects.js');
const soundControl=read('frontend/src/components/SoundControl.jsx');
const resetPassword=read('frontend/src/pages/ResetPassword.jsx');

assert.match(login,/login-topbar/);
assert.match(login,/login-form-heading/);
assert.match(login,/Sign in/);
assert.match(login,/GoogleButton/);
assert.doesNotMatch(login,/login-premium-visual|WELCOME TO PROPULSE|Technology built around business growth/);
assert.doesNotMatch(loginCss,/\.login-premium-visual|\.login-premium-image|\.login-premium-features|\.login-premium-quote/);

assert.match(signup,/signup-topbar/);
assert.match(signup,/signup-form-heading/);
assert.match(signup,/Create account/);
assert.match(signup,/signup-business-modal/);
assert.doesNotMatch(signup,/signup-premium-visual|JOIN PROPULSE|Bigger Growth/);
assert.doesNotMatch(signupCss,/\.signup-premium-visual|\.signup-visual-|\.signup-benefits|\.signup-quote/);

assert(app.includes("const MINIMAL_AUTH_ROUTES=new Set(['/login','/signup','/forgot-password','/reset-password']);"));
assert(app.includes("function GlobalWidgets(){const location=useLocation();const pathname=location.pathname.replace(/\\/+$/,'')||'/';if(MINIMAL_AUTH_ROUTES.has(pathname))return null;return <><GlobalLeadPopup/><SupportChatWidget/><SoundControl/></>}"));
assert.match(app, /<\/Routes>\s*<GlobalWidgets\/>\s*(?:<\/SiteAppearance>\s*)?<\/Suspense>/,
  'Global widgets must remain after the routes and inside Suspense, with an optional appearance wrapper');
assert(!app.includes("return <><GlobalWidgets/></>"),'GlobalWidgets must not recursively render itself');
assert(app.includes('<Route path="/professional-contact" element={<PortalContact audience="professionals"/>}/>'),'Auth layout changes must preserve the dedicated Professional contact audience');
assert(soundEffects.includes("const authPath=/^\\/(login|signup|forgot-password|reset-password)\\/?$/.test(window.location.pathname)"));
assert(soundEffects.includes("if(!authPath)refreshSoundSettings()"));
assert(soundControl.includes("refreshSoundSettings")&&soundControl.includes("useEffect(()=>{void refreshSoundSettings()},[])"));
assert(resetPassword.includes("password.length > 64")&&resetPassword.includes("passwordBytes > 72"));
assert(resetPassword.includes("!/[A-Za-z]/.test(password)")&&resetPassword.includes("!/\\d/.test(password)"));
assert(resetPassword.includes("8–64 characters and include at least one letter and one number."));

console.log('Auth pages forms-only regression test passed.');
