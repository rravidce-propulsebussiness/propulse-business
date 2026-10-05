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
assert(app.includes("</Routes><GlobalWidgets/></Suspense>"));
assert(!app.includes("return <><GlobalWidgets/></>"),'GlobalWidgets must not recursively render itself');

console.log('Auth pages forms-only regression test passed.');
