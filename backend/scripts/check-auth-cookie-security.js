const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const controller = read('src/controllers/authController.js');
const middleware = read('src/middleware/authMiddleware.js');
const service = read('src/services/authService.js');
const frontendAuth = fs.readFileSync(path.join(root, '../frontend/src/utils/auth.js'), 'utf8');
const frontendApi = fs.readFileSync(path.join(root, '../frontend/src/utils/api.js'), 'utf8');

assert(controller.includes("const AUTH_COOKIE = 'propulse_auth';"), 'Auth cookie name missing');
assert(controller.includes("'HttpOnly'"), 'Auth cookie must be HttpOnly');
assert(controller.includes("'SameSite=Lax'"), 'Auth cookie must use SameSite=Lax');
assert(controller.includes("parts.push('Secure')"), 'Auth cookie must be Secure in production');
assert(controller.includes('const { token, ...safeResult } = result;'), 'JWT must not be returned in the auth response body');
assert(controller.includes('revokeAuthSessions(tokenUser.id)'), 'Logout must revoke the server-side auth session');
assert(middleware.includes("part.startsWith('propulse_auth=')"), 'Auth middleware must read the auth cookie');
assert(service.includes('async function revokeAuthSessions(userId)'), 'Auth service must expose server-side session revocation');
assert(frontendAuth.includes("credentials: 'include'"), 'Frontend logout must send credentials');
assert(!frontendApi.includes('Authorization'), 'Frontend API must not attach bearer Authorization headers');
assert(!frontendApi.includes('propulse_auth_token'), 'Frontend API must not depend on the removed JWT localStorage key');

console.log('Authentication cookie security checks passed.');
