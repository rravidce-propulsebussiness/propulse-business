const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const routes=read('src/routes/authRoutes.js');
const server=read('src/server.js');
const limiter=read('src/middleware/rateLimitMiddleware.js');
const controller=read('src/controllers/authController.js');
const service=read('src/services/authService.js');
const forgot=read('../frontend/src/pages/ForgotPassword.jsx');
const reset=read('../frontend/src/pages/ResetPassword.jsx');
const app=read('../frontend/src/App.jsx');
const email=read('src/services/emailService.js');
const adminRoutes=read('src/routes/adminRoutes.js');
const adminController=read('src/controllers/adminController.js');
const adminService=read('src/services/adminService.js');
const adminUsers=read('../frontend/src/admin/pages/AdminUsers.jsx');

assert.match(routes,/password-recovery-email:v2:/,'forgot-password must use its own versioned email bucket');
assert.match(routes,/password-reset-token:v2:/,'reset-password must use its own versioned token bucket');
assert.match(routes,/max: 10,[\s\S]*password-recovery-email:v2:/,'forgot-password request limit must leave room for legitimate retries');
assert.match(routes,/max: 15,[\s\S]*password-reset-token:v2:/,'reset-password request limit must leave room for typing mistakes');

assert.match(server,/independentlyProtectedAuthPaths/,'recovery routes must be independently protected');
assert.match(server,/\/auth\/forgot-password/);
assert.match(server,/\/auth\/reset-password/);

assert.match(limiter,/code: 'RATE_LIMITED'/,'429 responses must expose a stable error code');
assert.match(limiter,/retryAfter: safeRetryAfter/,'429 responses must expose retry timing');
assert.match(limiter,/RateLimit-Reset/,'429 responses must expose reset timing');

assert.match(service,/created_at > CURRENT_TIMESTAMP - INTERVAL '60 seconds'/,'password reset email resend cooldown must be enforced');
assert.match(service,/async function discardPasswordResetToken/,'failed email sends must have a token cleanup helper');
assert.match(controller,/discardPasswordResetToken\(reset\.token\)/,'failed reset email delivery must discard the unusable token');
assert.match(controller,/PASSWORD_RESET_EMAIL_UNAVAILABLE/,'reset email failures must use a stable error code');
assert.match(controller,/ACCOUNT_NOT_FOUND/,'unknown recovery emails must return an explicit account-not-found code');
assert.match(controller,/No user found with this email address\./,'unknown recovery emails must show the requested missing-user message');
assert.match(controller,/password_reset_email_failure/,'reset delivery failures must create a dedicated operational event');
assert.match(controller,/providerStatus:Number\.isInteger/,'reset failure telemetry must preserve only the safe provider HTTP status');
assert.match(controller,/senderMode:emailService\.configurationHealth\(\)\.senderMode/,'reset failure telemetry must capture only a safe sender mode');
assert.match(controller,/process\.env\.PUBLIC_APP_URL[\s\S]*process\.env\.FRONTEND_URL[\s\S]*process\.env\.APP_URL/,'reset links must have resilient public URL fallback');

assert.match(forgot,/submittingRef/,'forgot-password form must block duplicate in-flight requests');
assert.match(forgot,/setCooldown\(60\)/,'forgot-password form must enforce a short resend cooldown');
assert.match(forgot,/Try again in/,'forgot-password form must show a retry countdown');
assert.match(forgot,/PASSWORD_RESET_EMAIL_UNAVAILABLE/,'forgot-password form must show a delivery-specific error');
assert.match(forgot,/ACCOUNT_NOT_FOUND/,'forgot-password form must handle missing accounts explicitly');
assert.match(forgot,/Reset link sent\. Please check your email\./,'forgot-password form must show an explicit successful send message');
assert.match(forgot,/Not in your inbox\? Check Spam or Promotions\./,'forgot-password success must guide users to spam/promotions');
assert.match(forgot,/prefers-reduced-motion/,'typing hint must respect reduced-motion preferences');
assert.match(forgot,/queueMicrotask\(\(\) => \{/,'typing hint state changes must be deferred out of the effect body');
assert.match(forgot,/active = false/,'typing hint async work must stop after unmount');
assert.match(reset,/Too many reset attempts/,'reset-password form must explain throttling');
assert.match(app,/import ForgotPassword from '\.\/pages\/ForgotPassword'/,'forgot-password must be in the main bundle');
assert.match(app,/import ResetPassword from '\.\/pages\/ResetPassword'/,'reset-password must be in the main bundle');
assert.doesNotMatch(app,/ForgotPassword=lazy/,'forgot-password must not depend on a route chunk');
assert.doesNotMatch(app,/ResetPassword=lazy/,'reset-password must not depend on a route chunk');
assert.match(email,/const maxAttempts=2/,'email provider must retry one transient failure');
assert.match(email,/transientProviderStatus\(response\.status\)/,'email provider retry must be limited to transient HTTP failures');
assert.match(email,/EMAIL_PROVIDER_REJECTED/,'email provider must expose a stable rejection code internally');
assert.match(email,/EMAIL_PROVIDER_TIMEOUT/,'email provider must expose a stable timeout code internally');
assert.match(email,/function configurationHealth\(\)/,'email provider must expose secret-free configuration health');
assert.match(email,/resend_test/,'email provider health must distinguish the Resend test sender');

assert.match(adminRoutes,/router\.use\(requireAuth,requireAdmin\)/,'Admin password reset must remain behind Admin authentication');
assert.match(adminRoutes,/userPasswordResetLimit=rateLimit\(\{windowMs:15\*60\*1000,max:10/,'Admin password reset must be independently rate-limited');
assert.match(adminRoutes,/router\.post\('\/users\/:id\/password-reset',userPasswordResetLimit,adminController\.sendUserPasswordReset\)/,'Admin Users must expose a dedicated password-reset route');
assert.match(adminController,/async function sendUserPasswordReset/,'Admin controller must expose password reset delivery');
assert.match(adminController,/PASSWORD_RESET_EMAIL_UNAVAILABLE:503/,'Admin reset delivery failures must surface as service unavailable');
assert.match(adminService,/async function sendUserPasswordReset/,'Admin service must implement password reset delivery');
assert.match(adminService,/authService\.createPasswordReset\(user\.email\)/,'Admin reset must reuse the standard one-time token flow');
assert.match(adminService,/emailService\.sendPasswordResetEmail\(\{to:user\.email,name:user\.name,resetUrl\}\)/,'Admin reset must reuse the normal email delivery template');
assert.match(adminService,/discardPasswordResetToken\(reset\.token\)/,'Admin reset must remove unusable tokens when delivery/configuration fails');
assert.match(adminService,/action:'send_password_reset_link'/,'Admin password reset requests must enter the account audit trail');
assert.match(adminService,/if\(!user\.is_active\)/,'Inactive accounts must not receive reset links');
assert.match(adminService,/reset-password#token=/,'Admin-issued reset links must keep tokens in the URL fragment');
assert.match(adminUsers,/Send password reset link/,'Admin Users Account 360 must expose password reset delivery');
assert.match(adminUsers,/Ask the user to check Inbox, Spam or Promotions/,'Admin reset success must guide support staff to Spam/Promotions');
assert.match(adminUsers,/disabled=\{!selected\.is_active\|\|userBusy==='password-reset'\}/,'Admin reset action must be disabled for inactive accounts and while sending');
assert.match(adminService,/function validAdminPassword\(password\)/,'Create Admin must have an explicit password-policy validator');
assert.match(adminService,/password\.length<ADMIN_PASSWORD_MIN_CHARS\|\|password\.length>ADMIN_PASSWORD_MAX_CHARS/,'Create Admin must enforce the same 8-64 character bounds');
assert.match(adminService,/Buffer\.byteLength\(password,'utf8'\)>BCRYPT_MAX_BYTES/,'Create Admin must enforce the bcrypt byte limit');
assert.match(adminService,/\[A-Za-z\]\/\.test\(password\)&&\/\\d\/\.test\(password\)/,'Create Admin must require at least one letter and one number');
assert.match(adminUsers,/new TextEncoder\(\)\.encode\(form\.password\)\.length/,'Create Admin UI must enforce the bcrypt byte limit before submit');
assert.match(adminUsers,/maxLength="64"/,'Create Admin password field must cap the visible character length');
assert.match(adminUsers,/placeholder="8–64 characters, letter \+ number"/,'Create Admin UI must explain the shared password policy');

console.log('Password recovery resilience regression test passed.');
