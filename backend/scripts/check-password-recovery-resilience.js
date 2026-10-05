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
assert.match(controller,/process\.env\.PUBLIC_APP_URL[\s\S]*process\.env\.FRONTEND_URL[\s\S]*process\.env\.APP_URL/,'reset links must have resilient public URL fallback');

assert.match(forgot,/submittingRef/,'forgot-password form must block duplicate in-flight requests');
assert.match(forgot,/setCooldown\(60\)/,'forgot-password form must enforce a short resend cooldown');
assert.match(forgot,/Try again in/,'forgot-password form must show a retry countdown');
assert.match(forgot,/PASSWORD_RESET_EMAIL_UNAVAILABLE/,'forgot-password form must show a delivery-specific error');
assert.match(reset,/Too many reset attempts/,'reset-password form must explain throttling');
assert.match(app,/import ForgotPassword from '\.\/pages\/ForgotPassword'/,'forgot-password must be in the main bundle');
assert.match(app,/import ResetPassword from '\.\/pages\/ResetPassword'/,'reset-password must be in the main bundle');
assert.doesNotMatch(app,/ForgotPassword=lazy/,'forgot-password must not depend on a route chunk');
assert.doesNotMatch(app,/ResetPassword=lazy/,'reset-password must not depend on a route chunk');
assert.match(email,/const maxAttempts=2/,'email provider must retry one transient failure');
assert.match(email,/transientProviderStatus\(response\.status\)/,'email provider retry must be limited to transient HTTP failures');
assert.match(email,/EMAIL_PROVIDER_REJECTED/,'email provider must expose a stable rejection code internally');
assert.match(email,/EMAIL_PROVIDER_TIMEOUT/,'email provider must expose a stable timeout code internally');

console.log('Password recovery resilience regression test passed.');
