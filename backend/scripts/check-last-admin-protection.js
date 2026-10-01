const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'src');
const adminService = fs.readFileSync(path.join(root, 'services', 'adminService.js'), 'utf8');
const adminController = fs.readFileSync(path.join(root, 'controllers', 'adminController.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  adminService.includes('const ADMIN_MUTATION_LOCK_NAMESPACE = 2147482999;') &&
  adminService.includes('pg_advisory_xact_lock($1)'),
  'Admin status and role mutations must share a transaction lock to prevent concurrent last-admin races',
);

assert(
  adminService.includes("if(current.role==='admin' && current.is_active && !Boolean(isActive))") &&
  adminService.includes("WHERE role='admin' AND is_active=TRUE") &&
  adminService.includes("if(activeAdmins<=1)"),
  'Deactivating the last active admin must be rejected',
);

assert(
  adminService.includes("error.code='LAST_ADMIN'") &&
  adminController.includes("if (error.code === 'LAST_ADMIN') return res.status(409).json({ error: error.message, code: error.code });"),
  'Last-admin protection must return a stable conflict response',
);

assert(
  adminService.includes("if(current.role==='admin'&&normalizedRole!=='admin')") &&
  adminService.includes('await lockAdminMutations(client);'),
  'Role demotion must use the same admin mutation lock',
);

console.log('Last-admin protection regression test passed.');
