const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const routes = read('src/routes/authRoutes.js');
const controller = read('src/controllers/authController.js');
const frontendAuth = read('../frontend/src/utils/auth.js');
const frontendApp = read('../frontend/src/App.jsx');

assert.match(routes, /router\.get\('\/session',\s*authController\.session\)/);
assert.doesNotMatch(routes, /router\.get\('\/session',\s*requireAuth/);
assert.match(routes, /router\.get\('\/me',\s*requireAuth,\s*authController\.me\)/);
assert.match(controller, /async function session\(/);
assert.match(controller, /authenticated:\s*false,\s*user:\s*null/);
assert.match(controller, /authenticated:\s*true,\s*user/);
assert.match(frontendAuth, /apiRequest\('\/auth\/session'/);
assert.doesNotMatch(frontendAuth, /bootstrapPromise\s*=\s*apiRequest\('\/auth\/me'/);
assert.match(frontendApp, /clearSession\(\{revoke:false\}\)/, 'Public app should fall back to anonymous mode when session bootstrap is unavailable');
assert.doesNotMatch(frontendApp, /Unable to verify your session/, 'A session API outage must not replace the public site with a blocking error page');

console.log('Anonymous-safe auth session bootstrap checks passed.');
